import multer from "multer";

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to allow only specific image and document types
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
  const allowedDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedDocumentTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images (jpeg, png, gif) and documents (pdf, doc, docx) are allowed.",
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10 MB limit per file
  },
});

export const uploadProjectFiles = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "files", maxCount: 10 },
]);
