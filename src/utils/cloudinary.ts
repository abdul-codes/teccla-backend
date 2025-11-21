import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary using the URL from environment variables
cloudinary.config();

export const uploadToCloudinary = (file: Express.Multer.File, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `real_estate/${folder}`,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'],
        transformation: { quality: 'auto', fetch_format: 'auto' }
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId: string) => {
  return cloudinary.uploader.destroy(publicId);
};