import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider, StorageResult } from './storage.interface';
import crypto from 'crypto';
import path from 'path';
import Logger from '../utils/logger';

export class R2Storage implements StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || '';

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error(
        'R2 storage not configured. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME'
      );
    }

    // R2 endpoint 
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto', // 
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // Public URL for accessing files
    this.publicUrl = process.env.R2_PUBLIC_URL || `https://pub-${accountId}.r2.dev`;
  }

  async save(file: Express.Multer.File, folder: string): Promise<StorageResult> {
    try {
      // Generate unique filename
      const uniqueSuffix = crypto.randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const filename = `${timestamp}_${uniqueSuffix}${ext}`;

      // Full key path in bucket (e.g., "projects/images/123456_abc123.jpg")
      const key = `${folder}/${filename}`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Construct public URL
      const url = `${this.publicUrl}/${key}`;

      // Get file format
      const format = ext.substring(1) || 'unknown';

      Logger.info(`File uploaded to R2: ${key} (${file.size} bytes)`);

      return {
        url,
        publicId: key,
        format,
        bytes: file.size,
        width: undefined,
        height: undefined,
      };
    } catch (error) {
      Logger.error('R2 upload error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload to R2: Unknown error');
    }
  }

  async delete(publicId: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: publicId,
      });

      await this.s3Client.send(command);
      Logger.info(`File deleted from R2: ${publicId}`);
    } catch (error) {
      Logger.error(`Failed to delete file from R2: ${publicId}`, error);
      throw error;
    }
  }
}
