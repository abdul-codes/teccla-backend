import { Request, Response } from "express";
import { asyncMiddleware } from "../../middleware/asyncMiddleware";
import { getStorageProvider } from "../../storage";
import { MessageType } from "../../../prisma/generated/prisma/client";
import { FILE_SIZE_LIMITS } from "../../shared/constants/fileLimits";

// Upload chat attachment (image or document)
// Uses the storage provider pattern (R2)

export const uploadChatAttachment = asyncMiddleware(
  async (req: Request, res: Response) => {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.file;

    // Determine message type based on MIME type
    let messageType: MessageType;
    let folder: string;

    if (file.mimetype.startsWith("image/")) {
      messageType = MessageType.IMAGE;
      folder = "chat/images";

      // Validate image file size (10MB)
      if (file.size > FILE_SIZE_LIMITS.IMAGE) {
        return res.status(400).json({
          success: false,
          message: "Image file size exceeds 10MB limit",
        });
      }
    } else {
      // Document
      messageType = MessageType.DOCUMENT;
      folder = "chat/documents";

      // Validate document file size (20MB)
      if (file.size > FILE_SIZE_LIMITS.DOCUMENT) {
        return res.status(400).json({
          success: false,
          message: "Document file size exceeds 20MB limit",
        });
      }
    }

    // Get storage provider (local or R2)
    const storage = getStorageProvider();

    // Save file to storage
    const result = await storage.save(file, folder);

    // Return upload result
    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
        messageType: messageType,
        fileName: file.originalname,
        fileSize: result.bytes,
        format: result.format,
      },
    });
  }
);

