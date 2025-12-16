import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/db";
import {
  CreateProjectInput,
  createProjectSchema,
  UpdateProjectInput,
} from "../validation/project";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { getStorageProvider } from "../storage";
import { AssetType, Project } from "../../prisma/generated/prisma/client";

// interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     role: string;
//   }
// }

export const getAllProjects = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({
          success: false,
          message: "Page must be greater than 0",
        });
      }
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: "Limit must be between 1 and 100",
        });
      }

      // Get total count for pagination metadata
      const total = await prisma.project.count();

      // Get paginated projects
      const projects = await prisma.project.findMany({
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
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return res.status(200).json({
        success: true,
        message: "Projects retrieved successfully",
        data: {
          projects,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage,
            hasPrevPage,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve projects",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
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

      project = await prisma.project.create({
        data: {
          ...validatedData,
          startDate: validatedData.startDate
            ? new Date(validatedData.startDate)
            : null,
          finishDate: validatedData.finishDate
            ? new Date(validatedData.finishDate)
            : null,
          createdById: req.user!.id,
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
          createdBy: { select: { id: true, firstName: true } },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: projectWithAssets,
      });
    } catch (error: unknown) {
      console.error("Project creation error:", error);

      // Rollback logic
      const storage = getStorageProvider();
      if (project) {
        await prisma.project.delete({ where: { id: project.id } });
      }
      for (const publicId of uploadedFileIds) {
        try {
          await storage.delete(publicId);
        } catch (err) {
          console.error(`Failed to delete file during rollback: ${publicId}`, err);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error. Rolled back project creation.",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error, // Include the raw error object to see what it is
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  },
);

// restrict available file type and size

export const getProjectById = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          asset: true,
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve project",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
        throw new Error("Project not found");
      }

      if (existingProject.createdById !== req.user!.id && req.user!.role !== "ADMIN") {
        throw new Error("Not authorized to update this project");
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
              console.error(`Failed to delete asset ${asset.publicId}:`, err)
            )
          )
        ).catch(err => console.error("Background asset deletion error:", err));
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
              console.error(`Failed to rollback file ${publicId}:`, err)
            )
          )
        ).catch(err => console.error("Rollback error:", err));
      }

      if (error instanceof Error) {
        // Operational errors - Log warning only
        if (error.message === "Project not found") {
          console.warn(`Update failed: Project ${id} not found`);
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }
        if (error.message === "Not authorized to update this project") {
          console.warn(`Update failed: User ${req.user?.id} unauthorized for project ${id}`);
          return res.status(403).json({
            success: false,
            message: "Not authorized to update this project",
          });
        }
      }

      // System errors - Log full error
      console.error("Project update error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

export const deleteProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
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
          console.error(`Failed to delete asset ${asset.publicId}:`, err)
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
    } catch (error) {
      console.error("Project delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during project deletion",
      });
    }
  },
);
