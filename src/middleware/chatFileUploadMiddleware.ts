import multer from "multer";

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to allow only images and documents for chat
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  
  const allowedDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedDocumentTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images (jpeg, png, gif, webp) and documents (pdf, doc, docx, ppt, pptx, xls, xlsx) are allowed.",
      ),
      false,
    );
  }
};

// Determine max file size based on mimetype
const getMaxFileSize = (mimetype: string): number => {
  // Images: 10MB
  if (mimetype.startsWith("image/")) {
    return 10 * 1024 * 1024;
  }
  // Documents: 20MB
  return 20 * 1024 * 1024;
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // Max 20MB (will be checked per file type in controller)
  },
});

export const uploadChatAttachment = upload.single("file");
