

export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
  MAX: 20 * 1024 * 1024, // Overall max for multer
} as const;
