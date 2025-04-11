import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { CreateProjectInput, createProjectSchema } from '../validation/project';
import { asyncMiddleware } from '../middleware/asyncMiddleware';

// interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     role: string;
//   }
// }

export const getAllProjects = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
       createdAt : 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Projects retrieved successfully',
      data: projects
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



export const createProject = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Validate request body
    const validatedData = createProjectSchema.parse(req.body) as CreateProjectInput;

    // Check if project with same title already exists
    const existingProject = await prisma.project.findUnique({
      where: { title: validatedData.title },
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'A project with this title already exists',
      });
    }

    // Create new project
    const project = await prisma.project.create({
      data: {
        ...validatedData,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        finishDate: validatedData.finishDate ? new Date(validatedData.finishDate) : null,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: {id: true, firstName: true}
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }
    console.error('Project creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// restrict available file type and size

