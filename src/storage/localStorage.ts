import fs from "fs";
import path from "path";
import crypto from "crypto";
import { StorageProvider, StorageResult } from "./storage.interface";

/**
 * Local filesystem storage implementation
 * Stores files in /uploads directory
 */
export class LocalStorage implements StorageProvider {
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor() {
    // Path to uploads directory (backend/uploads)
    this.uploadsDir = path.join(__dirname, "../../uploads");

    // Base URL for accessing files
    this.baseUrl = process.env.BACKEND_URL || "http://localhost:8000";
  }

  /**
   * Save file to local filesystem
   */
  async save(
    file: Express.Multer.File,
    folder: string,
  ): Promise<StorageResult> {
    // Create full directory path
    const uploadPath = path.join(this.uploadsDir, folder);

    // Create directory if it doesn't exist
    await fs.promises.mkdir(uploadPath, { recursive: true });

    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${uniqueSuffix}${ext}`;

    // Full path to save file
    const filePath = path.join(uploadPath, filename);

    // Write file to disk
    await fs.promises.writeFile(filePath, file.buffer);

    // Construct public URL
    const relativePath = `/${folder}/${filename}`;
    const url = `${this.baseUrl}/uploads${relativePath}`;

    // Public ID for deletion (relative path without leading slash)
    const publicId = `${folder}/${filename}`;

    // Get file format
    const format = ext.substring(1) || "unknown"; // Remove leading dot

    console.log(`File saved: ${publicId} (${file.size} bytes)`);

    return {
      url,
      publicId,
      format,
      bytes: file.size,
    };
  }

  /**
   * Delete file from local filesystem
   */
  async delete(publicId: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, publicId);

    try {
      // Check if file exists
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`File deleted: ${publicId}`);
      } else {
        console.log(`Warning: File not found (already deleted?): ${publicId}`);
      }
    } catch (error) {
      console.error(`Failed to delete file ${publicId}:`, error);
      throw error;
    }
  }
}
