import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import Logger from "../utils/logger";

export const requestJoinProject = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { reference, amount } = req.body as { reference: string; amount: number };
  const userId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      totalPrice: true,
      downPaymentPercentage: true,
      conversationId: true,
    },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (!project.totalPrice) {
    return res.status(400).json({
      success: false,
      message: "Project pricing not set. Contact admin.",
    });
  }

  const expectedAmount = Math.round(project.totalPrice * project.downPaymentPercentage * 100);
  if (amount < expectedAmount) {
    return res.status(400).json({
      success: false,
      message: `Minimum down payment is ₦${(expectedAmount / 100).toLocaleString()}`,
    });
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (existing && !["REJECTED", "REMOVED"].includes(existing.status)) {
    return res.status(400).json({
      success: false,
      message:
        existing.status === "PENDING_APPROVAL" || existing.status === "PAYMENT_RECEIVED"
          ? "Request pending approval"
          : "Already a member of this project",
    });
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {
      status: "PENDING_APPROVAL",
      paymentReference: reference,
      role: "MEMBER",
      joinedAt: new Date(),
    },
    create: {
      projectId,
      userId,
      status: "PENDING_APPROVAL",
      role: "MEMBER",
      paymentReference: reference,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, title: true } },
    },
  });

  Logger.info(`Join request submitted for project ${projectId} by user ${userId}`);

  return res.status(201).json({
    success: true,
    message: "Join request submitted. Payment received, awaiting approval.",
    data: { member },
  });
});

export const getPendingRequests = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== userId && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const pending = await prisma.projectMember.findMany({
    where: {
      projectId,
      status: { in: ["PENDING_APPROVAL", "PAYMENT_RECEIVED"] },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  return res.status(200).json({
    success: true,
    data: { requests: pending },
  });
});

export const approveMember = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId, userId } = req.params;
  const currentUserId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { conversation: true },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== currentUserId && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "No pending request" });
  }

  if (!["PENDING_APPROVAL", "PAYMENT_RECEIVED"].includes(membership.status)) {
    return res.status(400).json({ success: false, message: "Not a pending request" });
  }

  const updated = await prisma.projectMember.update({
    where: { id: membership.id },
    data: { status: "JOINED" },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (project.conversationId) {
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: project.conversationId, userId } },
      update: { role: "MEMBER" },
      create: {
        conversationId: project.conversationId,
        userId,
        role: "MEMBER",
      },
    });
  }

  Logger.info(`Member ${userId} approved for project ${projectId}`);

  return res.status(200).json({
    success: true,
    message: "Member approved and added to chat",
    data: { member: updated },
  });
});

export const rejectMember = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId, userId } = req.params;
  const { reason } = req.body as { reason?: string };
  const currentUserId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== currentUserId && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "No pending request" });
  }

  const updated = await prisma.projectMember.update({
    where: { id: membership.id },
    data: { status: "REJECTED" },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  Logger.info(`Member ${userId} rejected for project ${projectId}. Reason: ${reason || "None"}`);

  return res.status(200).json({
    success: true,
    message: reason || "Request declined",
    data: { member: updated },
  });
});

export const inviteUserToProject = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { userId, role = "MEMBER" } = req.body;
  const currentUserId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { conversation: true },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== currentUserId && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (existing && !["REJECTED", "REMOVED"].includes(existing.status)) {
    return res.status(400).json({ success: false, message: "Already a member or pending" });
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { status: "JOINED", role, joinedAt: new Date() },
    create: {
      projectId,
      userId,
      status: "JOINED",
      role,
      createdById: currentUserId,
    },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (project.conversationId) {
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: project.conversationId, userId } },
      update: { role: role === "ADMIN" ? "ADMIN" : "MEMBER" },
      create: {
        conversationId: project.conversationId,
        userId,
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
    });
  }

  Logger.info(`User ${userId} invited to project ${projectId} by ${currentUserId}`);

  return res.status(201).json({
    success: true,
    message: "User invited and added to project and chat",
    data: { projectMember: member },
  });
});

export const leaveProject = asyncMiddleware(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "Not a member" });
  }

  if (!["JOINED", "PAID_DOWN", "PAID_COMPLETION", "PAID_FULL"].includes(membership.status)) {
    return res.status(400).json({
      success: false,
      message: "Cannot leave while request is pending",
    });
  }

  await prisma.projectMember.update({
    where: { id: membership.id },
    data: { status: "REMOVED" },
  });

  return res.status(200).json({ success: true, message: "Left project" });
});

export const getProjectMembers = asyncMiddleware(async (req: Request, res: Response) => {
  const { id } = req.params;

  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return res.status(200).json({
    success: true,
    message: "Project members retrieved successfully",
    data: { members },
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
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const formattedProjects = myProjects.map((mp) => ({
    project: mp.project,
    memberStatus: mp.status,
    joinedAt: mp.joinedAt,
    role: mp.role,
  }));

  return res.status(200).json({
    success: true,
    message: "My projects retrieved successfully",
    data: { myProjects: formattedProjects },
  });
});

export const removeUserFromProject = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId, userId } = req.params;
  const currentUserId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== currentUserId && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "User is not a member" });
  }

  await prisma.projectMember.update({
    where: { id: membership.id },
    data: { status: "REMOVED" },
  });

  return res.status(200).json({
    success: true,
    message: "User removed from project successfully",
  });
});

export const updateMemberStatus = asyncMiddleware(async (req: Request, res: Response) => {
  const { projectId, userId } = req.params;
  const { status } = req.body;
  const currentUserId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (project.createdById !== currentUserId && req.user!.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!membership) {
    return res.status(404).json({ success: false, message: "User is not a member" });
  }

  const updatedMember = await prisma.projectMember.update({
    where: { id: membership.id },
    data: { status },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return res.status(200).json({
    success: true,
    message: "Member status updated successfully",
    data: { member: updatedMember },
  });
});
