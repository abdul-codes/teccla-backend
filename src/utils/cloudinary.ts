import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary using the URL from environment variables
cloudinary.config({
  ...cloudinary.config(),
  timeout: 60000, // 60 secs
});


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