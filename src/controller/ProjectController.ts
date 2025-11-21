import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/db";
import {
  CreateProjectInput,
  createProjectSchema,
  UpdateProjectInput,
} from "../validation/project";
import { asyncMiddleware } from "../middleware/asyncMiddleware";

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
      const projects = await prisma.project.findMany({
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

      return res.status(200).json({
        success: true,
        message: "Projects retrieved successfully",
        data: projects,
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

import { deleteFromCloudinary, uploadToCloudinary } from "../utils/cloudinary";
import { AssetType, Project } from "@prisma/client";

// ... (keep getAllProjects)

export const createProject = asyncMiddleware(
  async (req: Request, res: Response) => {
    let project: Project | null = null;
    const uploadedCloudinaryPublicIds: string[] = [];

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

      const processFiles = (
        fileArray: Express.Multer.File[],
        assetType: AssetType,
      ) => {
        for (const file of fileArray) {
          fileUploadPromises.push(
            (async () => {
              const result = await uploadToCloudinary(file, "projects");
              uploadedCloudinaryPublicIds.push(result.public_id); // Track for rollback

              await prisma.asset.create({
                data: {
                  url: result.secure_url,
                  publicId: result.public_id,
                  assetType: assetType,
                  format: result.format,
                  bytes: result.bytes.toString(),
                  width: result.width.toString(),
                  height: result.height.toString(),
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
      if (project) {
        await prisma.project.delete({ where: { id: project.id } });
      }
      for (const publicId of uploadedCloudinaryPublicIds) {
        await deleteFromCloudinary(publicId);
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error. Rolled back project creation.",
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

    try {
      // Use transaction for atomic operations
      const result = await prisma.$transaction(async (tx) => {
        // Get existing project with assets
        const existingProject = await tx.project.findUnique({
          where: { id },
          include: { asset: true }
        });

        if (!existingProject) {
          throw new Error("Project not found");
        }

        // Authorization check
        if (existingProject.createdById !== req.user!.id && req.user!.role !== "ADMIN") {
          throw new Error("Not authorized to update this project");
        }

        // Handle asset deletions if specified
        if (validatedData.deleteAssets && Array.isArray(validatedData.deleteAssets)) {
          const assetsToDelete = await tx.asset.findMany({
            where: {
              id: { in: validatedData.deleteAssets },
              projectId: id,
            },
          });

          for (const asset of assetsToDelete) {
            await deleteFromCloudinary(asset.publicId);
            await tx.asset.delete({ where: { id: asset.id } });
          }
        }

        // Handle new file uploads
        const files = (req.files as {
          [fieldname: string]: Express.Multer.File[];
        }) || {};

        if (files.images?.length || files.files?.length) {
          const fileUploadPromises: Promise<void>[] = [];

          const processFiles = (
            fileArray: Express.Multer.File[],
            assetType: AssetType,
          ) => {
            for (const file of fileArray) {
              fileUploadPromises.push(
                (async () => {
                  const result = await uploadToCloudinary(file, "projects");
                  await tx.asset.create({
                    data: {
                      url: result.secure_url,
                      publicId: result.public_id,
                      assetType: assetType,
                      format: result.format,
                      bytes: result.bytes.toString(),
                      width: result.width.toString(),
                      height: result.height.toString(),
                      uploadedById: req.user!.id,
                      projectId: id,
                    },
                  });
                })(),
              );
            }
          };

          if (files.images) processFiles(files.images, AssetType.IMAGE);
          if (files.files) processFiles(files.files, AssetType.DOCUMENT);

          await Promise.all(fileUploadPromises);
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

        return updatedProject;
      });

      return res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Project update error:", error);
      if (error instanceof Error) {
        if (error.message === "Project not found") {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }
        if (error.message === "Not authorized to update this project") {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update this project",
          });
        }
      }
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

      // Clean up Cloudinary assets first
      const cloudinaryDeletePromises = projectWithAssets.asset.map(asset => 
        deleteFromCloudinary(asset.publicId).catch(err => 
          console.error(`Failed to delete asset ${asset.publicId}:`, err)
        )
      );

      await Promise.all(cloudinaryDeletePromises);

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
