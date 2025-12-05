import multer from "multer";
import { Request } from "express";
import { FileFilterCallback } from "multer";
import { ALLOWED_FILE_TYPES, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } from "../shared/constants/fileTypes";
import { FILE_SIZE_LIMITS } from "../shared/constants/fileLimits";

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to allow only images and documents for chat
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    const error = new Error(
      "Invalid file type. Only images (jpeg, png, gif, webp) and documents (pdf, doc, docx, ppt, pptx, xls, xlsx) are allowed.",
    );
    cb(error);
  }
};

// Determine max file size based on mimetype
const getMaxFileSize = (mimetype: string): number => {
  // Images: 10MB
  if (mimetype.startsWith("image/")) {
    return FILE_SIZE_LIMITS.IMAGE;
  }
  // Documents: 20MB
  return FILE_SIZE_LIMITS.DOCUMENT;
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.MAX, // Max 20MB (will be checked per file type in controller)
  },
});

export const uploadChatAttachment = upload.single("file");
