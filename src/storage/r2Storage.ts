import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider, StorageResult } from './storage.interface';
import crypto from 'crypto';
import path from 'path';


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
      region: 'auto', // R2 uses "auto" as region
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // Public URL for accessing files
    this.publicUrl = process.env.R2_PUBLIC_URL || `https://pub-${accountId}.r2.dev`;
  }

 //  Save file to R2 bucket
 
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
        // Optional: Add metadata
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

      console.log(`File uploaded to R2: ${key} (${file.size} bytes)`);

      return {
        url,
        publicId: key, // Use the key as publicId for deletion
        format,
        bytes: file.size,
        // R2 doesn't auto-extract image dimensions, would need sharp for that
        width: undefined,
        height: undefined,
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error(`Failed to upload to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

 // Delete file from R2 bucket

  async delete(publicId: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: publicId,
      });

      await this.s3Client.send(command);
      console.log(`File deleted from R2: ${publicId}`);
    } catch (error) {
      console.error(`Failed to delete file from R2: ${publicId}`, error);
      throw error;
    }
  }
}
