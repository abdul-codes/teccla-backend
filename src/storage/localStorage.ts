import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider, StorageResult } from './storage.interface';
import Logger from '../utils/logger';

export class LocalStorage implements StorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.baseUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  }

  async save(file: Express.Multer.File, folder: string): Promise<StorageResult> {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${uniqueSuffix}${ext}`;

    // Create folder if it doesn't exist
    const folderPath = path.join(this.uploadDir, folder);
    await fs.mkdir(folderPath, { recursive: true });

    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, file.buffer);

    // Construct public URL and ID
    // publicId is the relative path from uploads dir
    const publicId = `${folder}/${filename}`;
    const url = `${this.baseUrl}/uploads/${publicId}`;

    Logger.info(`File saved locally: ${publicId} (${file.size} bytes)`);

    return {
      url,
      publicId,
      format: ext.substring(1),
      bytes: file.size,
      width: undefined, // Would need sharp/image-size to get dimensions
      height: undefined
    };
  }

  async delete(publicId: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, publicId);
      await fs.unlink(filePath);
      Logger.info(`File deleted locally: ${publicId}`);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        Logger.warn(`File not found for deletion: ${publicId}`);
        return;
      }
      Logger.error(`Failed to delete file ${publicId}:`, error);
      throw error;
    }
  }
}
