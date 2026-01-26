import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/db";
import {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectQueryInput,
} from "../validation/project";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { getStorageProvider } from "../storage";
import { AssetType, Project, ParticipantRole } from "../../prisma/generated/prisma/client";
import Logger from "../utils/logger";

// interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     role: string;
//   }
// }

export const getFilteredProjects = asyncMiddleware(
  async (req: Request, res: Response) => {
    // 1. Parse and validate query parameters
    const {
      page,
      limit,
      search,
      status,
      type,
      budgetMin,
      budgetMax,
      dateFrom,
      dateTo,
      location,
      sortBy,
      sortOrder,
      createdBy,
      isPublic
    } = req.query as unknown as ProjectQueryInput;

    const skip = (page - 1) * limit;

    // 2. Build dynamic where clause for filtering
    const andClauses: any[] = [];

    // Search filter (title + description)
    if (search) {
      andClauses.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    // Individual filters
    if (status) andClauses.push({ status: status });
    if (type) andClauses.push({ type: type });
    if (location) andClauses.push({ location: { contains: location, mode: 'insensitive' } });
    if (createdBy) andClauses.push({ createdById: createdBy });

    // Visibility filter logic:
    // If not admin, only show public projects OR projects created by user
    if (req.user?.role !== 'ADMIN') {
      andClauses.push({
        OR: [
          { isPublic: true },
          { createdById: req.user?.id }
        ]
      });
    } else if (isPublic !== undefined) {
      andClauses.push({ isPublic: isPublic });
    }

    // Budget range filter
    if (budgetMin || budgetMax) {
      const budgetClause: any = {};
      if (budgetMin) budgetClause.gte = budgetMin;
      if (budgetMax) budgetClause.lte = budgetMax;
      andClauses.push({ budget: budgetClause });
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const dateClause: any = {};
      if (dateFrom) dateClause.gte = new Date(dateFrom);
      if (dateTo) dateClause.lte = new Date(dateTo);
      andClauses.push({ createdAt: dateClause });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    // 3. Execute optimized Prisma query
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          conversation: {
            select: { id: true }
          },
          asset: {
            take: 1, // Only get one thumbnail for listing efficiency
            where: { assetType: AssetType.IMAGE }
          }
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.project.count({ where }),
    ]);

    // 4. Add row numbers and format budget
    const projectsWithNumbers = projects.map((project, index) => ({
      ...project,
      rowNumber: skip + index + 1,
      budget: Number(project.budget.toFixed(2)), // Format to 2 decimal places
    }));

    // 5. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // 6. Calculate statistics
    const statistics = {
      totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
      averageBudget: projects.length > 0 ? projects.reduce((sum, p) => sum + p.budget, 0) / projects.length : 0,
      statusCounts: {
        PLANNING: projects.filter(p => p.status === 'PLANNING').length,
        IN_PROGRESS: projects.filter(p => p.status === 'IN_PROGRESS').length,
        COMPLETED: projects.filter(p => p.status === 'COMPLETED').length,
      },
      typeCounts: {
        RESIDENTIAL: projects.filter(p => p.type === 'RESIDENTIAL').length,
        COMMERCIAL: projects.filter(p => p.type === 'COMMERCIAL').length,
        INDUSTRIAL: projects.filter(p => p.type === 'INDUSTRIAL').length,
        INFRASTRUCTURE: projects.filter(p => p.type === 'INFRASTRUCTURE').length,
        RENOVATION: projects.filter(p => p.type === 'RENOVATION').length,
        MAINTENANCE: projects.filter(p => p.type === 'MAINTENANCE').length,
        CONSULTING: projects.filter(p => p.type === 'CONSULTING').length,
        OTHER: projects.filter(p => p.type === 'OTHER').length,
      }
    };

    // 7. Return enhanced response
    return res.status(200).json({
      success: true,
      message: "Projects retrieved successfully",
      data: {
        projects: projectsWithNumbers,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          applied: {
            search,
            status,
            type,
            budgetMin,
            budgetMax,
            dateFrom,
            dateTo,
            location,
            createdBy
          },
          sorting: {
            sortBy,
            sortOrder
          }
        },
        statistics: {
          ...statistics,
          totalBudget: Number(statistics.totalBudget.toFixed(2)),
          averageBudget: Number(statistics.averageBudget.toFixed(2)),
        }
      },
    });
  },
);

export const getPublicProjects = asyncMiddleware(
  async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      type,
      location,
      search
    } = req.query as any;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isPublic: true
    };

    if (type) where.type = type;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          asset: {
            where: { assetType: AssetType.IMAGE },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.project.count({ where })
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  }
);




export const createProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    let project: Project | null = null;
    const uploadedFileIds: string[] = [];

    try {
      const validatedData: CreateProjectInput = req.body;

      const existingProject = await prisma.project.findUnique({
        where: { title: validatedData.title },
      });

      if (existingProject) {
        return res.status(400).json({
          success: false,
          message: "A project with this title already exists",
        });
      }

      const { includeConversation, ...prismaData } = validatedData;

      project = await prisma.project.create({
        data: {
          ...prismaData,
          startDate: validatedData.startDate
            ? new Date(validatedData.startDate)
            : null,
          finishDate: validatedData.finishDate
            ? new Date(validatedData.finishDate)
            : null,
          createdBy: { connect: { id: req.user!.id } },
          ...(includeConversation !== false && {
            conversation: {
              create: {
                name: `${validatedData.title} - Group Chat`,
                description: `Discussion group for ${validatedData.title}`,
                isGroup: true,
                createdBy: req.user!.id,
                participants: {
                  create: {
                    userId: req.user!.id,
                    role: ParticipantRole.ADMIN,
                  }
                }
              }
            }
          })
        },
        include: {
          asset: true,
          conversation: {
            include: {
              participants: true
            }
          },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const files =
        (req.files as {
          [fieldname: string]: Express.Multer.File[];
        }) || {};
      const fileUploadPromises: Promise<void>[] = [];

      // Get storage provider (local, R2, etc.)
      const storage = getStorageProvider();

      const processFiles = (
        fileArray: Express.Multer.File[],
        assetType: AssetType,
      ) => {
        const folder = assetType === AssetType.IMAGE ? 'projects/images' : 'projects/documents';

        for (const file of fileArray) {
          fileUploadPromises.push(
            (async () => {
              // Upload using storage abstraction
              const result = await storage.save(file, folder);
              uploadedFileIds.push(result.publicId); // Track for rollback

              await prisma.asset.create({
                data: {
                  url: result.url,
                  publicId: result.publicId,
                  assetType: assetType,
                  format: result.format,
                  bytes: result.bytes.toString(),
                  width: result.width ? result.width.toString() : "0",
                  height: result.height ? result.height.toString() : "0",
                  uploadedById: req.user!.id,
                  projectId: project!.id,
                },
              });
            })(),
          );
        }
      };

      if (files.images) processFiles(files.images, AssetType.IMAGE);
      if (files.files) processFiles(files.files, AssetType.DOCUMENT);

      await Promise.all(fileUploadPromises);

      const projectWithAssets = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          asset: true,
          conversation: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: projectWithAssets,
      });
    } catch (error: unknown) {
      Logger.error("Project creation error:", error);

      // Rollback logic
      const storage = getStorageProvider();
      if (project) {
        await prisma.project.delete({ where: { id: project.id } }).catch(e => Logger.error("Rollback DB delete failed", e));
      }
      for (const publicId of uploadedFileIds) {
        await storage.delete(publicId).catch(err =>
          Logger.error(`Failed to delete file during rollback: ${publicId}`, err)
        );
      }

      throw error;
    }
  },
);


// restrict available file type and size

export const getProjectById = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        asset: true,
        conversation: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Project retrieved successfully",
      data: project,
    });
  },
);


export const updateProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData: UpdateProjectInput = req.body;
    const uploadedFileIds: string[] = [];
    const storage = getStorageProvider();

    try {
      // 1. Initial check for existence and authorization (fast)
      const existingProject = await prisma.project.findUnique({
        where: { id },
        select: { createdById: true }
      });

      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      if (existingProject.createdById !== req.user!.id && req.user!.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this project",
        });
      }

      // 2. Handle new file uploads BEFORE transaction
      const files = (req.files as {
        [fieldname: string]: Express.Multer.File[];
      }) || {};

      const newAssetsData: {
        url: string;
        publicId: string;
        assetType: AssetType;
        format: string;
        bytes: string;
        width: string;
        height: string;
        uploadedById: string;
        projectId: string;
      }[] = [];

      if (files.images?.length || files.files?.length) {
        const fileUploadPromises: Promise<void>[] = [];

        const processFiles = (
          fileArray: Express.Multer.File[],
          assetType: AssetType,
        ) => {
          const folder = assetType === AssetType.IMAGE ? 'projects/images' : 'projects/documents';

          for (const file of fileArray) {
            fileUploadPromises.push(
              (async () => {
                const result = await storage.save(file, folder);
                uploadedFileIds.push(result.publicId); // Track for rollback

                newAssetsData.push({
                  url: result.url,
                  publicId: result.publicId,
                  assetType: assetType,
                  format: result.format,
                  bytes: result.bytes.toString(),
                  width: result.width ? result.width.toString() : "0",
                  height: result.height ? result.height.toString() : "0",
                  uploadedById: req.user!.id,
                  projectId: id,
                });
              })(),
            );
          }
        };

        if (files.images) processFiles(files.images, AssetType.IMAGE);
        if (files.files) processFiles(files.files, AssetType.DOCUMENT);

        await Promise.all(fileUploadPromises);
      }

      // 3. Database Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Handle asset deletions if specified
        let assetsToDelete: { publicId: string }[] = [];
        if (validatedData.deleteAssets && Array.isArray(validatedData.deleteAssets)) {
          // Get publicIds before deleting from DB
          const assets = await tx.asset.findMany({
            where: {
              id: { in: validatedData.deleteAssets },
              projectId: id,
            },
            select: { publicId: true, id: true }
          });

          assetsToDelete = assets;

          if (assets.length > 0) {
            await tx.asset.deleteMany({
              where: { id: { in: assets.map(a => a.id) } }
            });
          }
        }

        // Insert new assets
        if (newAssetsData.length > 0) {
          await tx.asset.createMany({
            data: newAssetsData
          });
        }

        // Update project data
        const updatedProject = await tx.project.update({
          where: { id },
          data: {
            title: validatedData.title,
            description: validatedData.description,
            location: validatedData.location,
            budget: validatedData.budget,
            type: validatedData.type,
            status: validatedData.status,
            startDate: validatedData.startDate
              ? new Date(validatedData.startDate)
              : undefined,
            finishDate: validatedData.finishDate
              ? new Date(validatedData.finishDate)
              : undefined,
          },
          include: {
            asset: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        return { updatedProject, assetsToDelete };
      });

      // 4. Post-Transaction Cleanup (Delete old assets from storage)
      // Only runs if transaction succeeded
      if (result.assetsToDelete && result.assetsToDelete.length > 0) {
        Promise.all(
          result.assetsToDelete.map(asset =>
            storage.delete(asset.publicId).catch(err =>
              Logger.error(`Failed to delete asset ${asset.publicId}:`, err)
            )
          )
        ).catch(err => Logger.error("Background asset deletion error:", err));
      }

      return res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: result.updatedProject,
      });

    } catch (error) {
      // Rollback: Delete newly uploaded files if anything failed
      if (uploadedFileIds.length > 0) {
        Promise.all(
          uploadedFileIds.map(publicId =>
            storage.delete(publicId).catch(err =>
              Logger.error(`Failed to rollback file ${publicId}:`, err)
            )
          )
        ).catch(err => Logger.error("Rollback error:", err));
      }

      throw error;
    }
  },
);


export const deleteProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get project with assets for cleanup
    const projectWithAssets = await prisma.project.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!projectWithAssets) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Authorization check
    if (projectWithAssets.createdById !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this project",
      });
    }

    // Clean up storage assets first
    const storage = getStorageProvider();
    const deletePromises = projectWithAssets.asset.map(asset =>
      storage.delete(asset.publicId).catch(err =>
        Logger.error(`Failed to delete asset ${asset.publicId}:`, err)
      )
    );

    await Promise.all(deletePromises);

    // Delete project (cascade will handle DB assets)
    await prisma.project.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Project and assets deleted successfully",
      data: { deletedAssetsCount: projectWithAssets.asset.length }
    });
  },
);

