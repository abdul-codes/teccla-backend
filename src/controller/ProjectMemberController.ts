import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import Logger from "../utils/logger";

export const joinProject = asyncMiddleware(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id }
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } }
  });

  if (existingMember) {
    return res.status(400).json({ success: false, message: "Already a member of this project" });
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId: id,
      userId,
      role: 'MEMBER',
      status: 'JOINED',
    },
    include: {
      project: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });

  return res.status(201).json({
    success: true,
    message: "Successfully joined the project",
    data: {
      projectMember: member
    }
  });
});

export const leaveProject = asyncMiddleware(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } }
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "You are not a member of this project" });
  }

  await prisma.projectMember.delete({
    where: { id: membership.id }
  });

  return res.status(200).json({
    success: true,
    message: "Successfully left the project"
  });
});

export const getProjectMembers = asyncMiddleware(async (req: Request, res: Response) => {
  const { id } = req.params;

  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true }
      }
    },
    orderBy: { joinedAt: 'asc' }
  });

  return res.status(200).json({
    success: true,
    message: "Project members retrieved successfully",
    data: { members }
  });
});

export const getMyProjects = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const myProjects = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }
    },
    orderBy: { joinedAt: 'desc' }
  });

  const formattedProjects = myProjects.map(mp => ({
    project: mp.project,
    memberStatus: mp.status,
    joinedAt: mp.joinedAt,
    role: mp.role
  }));

  return res.status(200).json({
    success: true,
    message: "My projects retrieved successfully",
    data: { myProjects: formattedProjects }
  });
});

export const removeUserFromProject = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId, userId } = req.params;
  const currentUserId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== currentUserId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: "Not authorized to remove users from this project" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "User is not a member of this project" });
  }

  await prisma.projectMember.delete({
    where: { id: membership.id }
  });

  return res.status(200).json({
    success: true,
    message: "User removed from project successfully"
  });
});

export const updateMemberStatus = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId, userId } = req.params;
  const { status } = req.body;
  const currentUserId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== currentUserId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: "Not authorized to update member status" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "User is not a member of this project" });
  }

  const updatedMember = await prisma.projectMember.update({
    where: { id: membership.id },
    data: { status },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });

  return res.status(200).json({
    success: true,
    message: "Member status updated successfully",
    data: { member: updatedMember }
  });
});
