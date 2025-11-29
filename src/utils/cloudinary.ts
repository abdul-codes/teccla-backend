import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary using the URL from environment variables
cloudinary.config(true);

export const uploadToCloudinary = (file: Express.Multer.File, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
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

export const uploadBase64ToCloudinary = async (base64Data: string, folder: string = "profile_pictures") => {
    // Validate image size (Option 2)
    const base64Length = base64Data.length;
    const fileSizeBytes = (base64Length * 0.75) - (base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0);
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (fileSizeBytes > maxSizeBytes) {
      throw new Error("Image size exceeds 10MB limit.");
    }

    const result = await cloudinary.uploader.upload(base64Data, {
      folder: folder,
      resource_type: "image",
    });
    return result.secure_url;
};

export const deleteFromCloudinary = async (publicId: string) => {
  return cloudinary.uploader.destroy(publicId);
};