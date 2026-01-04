import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { uploadBase64ToCloudinary } from "../utils/cloudinary";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { UserProfileUpdateSchema } from "../validation/userProfile";
import Logger from "../utils/logger";



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

export const getUserProfile = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id; // From auth middleware
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userProfileSelect
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    message: "Profile fetched successfully",
    user,
  });
});

export const updateUserProfile = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id; // From auth middleware
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const validationResult = UserProfileUpdateSchema.safeParse(req.body)
  if (!validationResult.success) {
    Logger.info('Validation failed:', { errors: validationResult.error.format(), body: req.body });
    return res.status(400).json({
      message: "Invalid Input Data",
      errors: validationResult.error.format()
    })
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
    if (profilePicture.startsWith("data:image/")) {
      updateData.profilePicture = await uploadBase64ToCloudinary(profilePicture);
    } else {
      updateData.profilePicture = profilePicture;
    }
  }

  // Check if user exists before attempting update
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

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
});



