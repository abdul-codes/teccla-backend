import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { asyncMiddleware } from '../middleware/asyncMiddleware';

export const getMyProjects = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const projectMembers = await prisma.projectMember.findMany({
        where: { userId },
        include: {
          project: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      const result = projectMembers.map((member) => ({
        project: member.project,
        memberStatus: member.status,
        joinedAt: member.joinedAt,
        role: member.role,
      }));

      return res.status(200).json({
        success: true,
        message: 'User projects retrieved successfully',
        data: { myProjects: result },
      });
    } catch (error) {
      console.error('Get my projects error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user projects',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export const leaveProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const userId = req.user!.id;

    try {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            userId,
            projectId,
          },
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Project membership not found',
        });
      }

      if (member.status !== 'JOINED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot leave project after making payments',
        });
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            userId,
            projectId,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Left project successfully',
      });
    } catch (error) {
      console.error('Leave project error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to leave project',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export const inviteUserToProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const { userId } = req.body;
    const inviterId = req.user!.id;

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { createdById: true, isPublic: true },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      if (project.createdById !== inviterId && req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to invite users to this project',
        });
      }

      const userToInvite = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userToInvite) {
        return res.status(404).json({
          success: false,
          message: 'User to invite not found',
        });
      }

      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            userId,
            projectId,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'User is already a member of this project',
        });
      }

      const projectMember = await prisma.projectMember.create({
        data: {
          projectId,
          userId,
          role: 'MEMBER',
          status: 'JOINED',
        },
      });

      return res.status(201).json({
        success: true,
        message: 'User invited to project successfully',
        data: { projectMember },
      });
    } catch (error) {
      console.error('Invite user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to invite user to project',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export const removeUserFromProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id: projectId, userId: targetUserId } = req.params;
    const requesterId = req.user!.id;

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { createdById: true },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      if (project.createdById !== requesterId && req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to remove users from this project',
        });
      }

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            userId: targetUserId,
            projectId,
          },
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Project membership not found',
        });
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            userId: targetUserId,
            projectId,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'User removed from project successfully',
      });
    } catch (error) {
      console.error('Remove user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove user from project',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
