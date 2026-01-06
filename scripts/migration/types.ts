/**
 * Migration Type Definitions
 * 
 * Centralized type definitions for the migration process.
 * This allows consistent typing across all migration modules.
 */

export interface MigrationConfig {
  uploadsDir: string;
  dryRun: boolean;
  verbose: boolean;
}

export interface FileMapping {
  localPath: string;      // Local file path: "uploads/chat/images/123.jpg"
  folder: string;         // R2 folder: "chat/images"
  filename: string;       // Filename: "123.jpg"
  oldUrl: string;         // Current URL in database
  newUrl?: string;        // New R2 URL after upload
  publicId?: string;      // R2 public ID for deletion
  uploaded: boolean;      // Upload completion status
  dbUpdated: boolean;     // Database update status
}

export interface MigrationReport {
  totalFiles: number;
  uploadedFiles: number;
  failedUploads: string[];
  dbRecordsUpdated: number;
  failedDbUpdates: string[];
  startTime: Date;
  endTime?: Date;
  mappings?: FileMapping[];
}
