import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { v2 as cloudinary } from "cloudinary";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { UserProfileUpdateSchema } from "../validation/userProfile";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImageToCloudinary = async (imageData: string) => {
  try {

    if (!imageData.startsWith("data:image/")) {
      throw new Error("Invalid file type. Only images are allowed.");
    }

    // Validate image size (Option 2)
    const base64Length = imageData.length;
    const fileSizeBytes = (base64Length * 0.75) - (imageData.endsWith("==") ? 2 : imageData.endsWith("=") ? 1 : 0);
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (fileSizeBytes > maxSizeBytes) {
      throw new Error("Image size exceeds 5MB limit.");
    }

    const result = await cloudinary.uploader.upload(imageData, {
      folder: "profile_pictures",
      resource_type: "image",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload profile image");
  }
};

const userProfileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  companyName: true,
  companyRole: true,
  address: true,
  city: true,
  state: true,
  country: true,
  profilePicture: true,
  role: true,
  updatedAt: true, // Added to track when profile was last updated
};

export const updateUserProfile = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id; // From auth middleware
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const validationResult = UserProfileUpdateSchema.safeParse(req.body)
  if (!validationResult.success) {
    return res.status(400).json({ message: "Invalid Input Data", errors: validationResult.error })
  }

  const {
    firstName,
    lastName,
    phoneNumber,
    companyName,
    companyRole,
    address,
    city,
    state,
    country,
    profilePicture,
  } = req.body;



  // // Handle profile image upload if provided
  // let profilePictureUrl = undefined;
  // if (profileImage) {
  //   try {
  //     // Upload to Cloudinary
  //     const result = await cloudinary.uploader.upload(profileImage, {
  //       folder: "profile_pictures",
  //       resource_type: "auto",
  //     });
  //     profilePictureUrl = result.secure_url;
  //   } catch (error) {
  //     console.error("Cloudinary upload error:", error);
  //     return res.status(500).json({ message: "Failed to upload profile image" });
  //   }
  // }
  // Helper function for uploading image to Cloudinary

  // Prepare update data - only include fields that are present
  const updateData: any = {};

  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (companyName !== undefined) updateData.companyName = companyName;
  if (companyRole !== undefined) updateData.companyRole = companyRole;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (state !== undefined) updateData.state = state;
  if (country !== undefined) updateData.country = country;

  // Handle profile image upload if provided
  if (profilePicture) {
    try {
      updateData.profilePicture = await uploadImageToCloudinary(profilePicture);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to upload profile Picture"
      });
    }
  }
  try {
    // Check if user exists before attempting update
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profilePicture: true,
        role: true,
        companyName: true,
        companyRole: true,
        address: true,
        city: true,
        state: true,
        country: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      message: "Error updating profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});


