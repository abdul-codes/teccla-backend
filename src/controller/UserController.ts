import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs";

// Get current user profile
export const getCurrentUser = asyncMiddleware(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  },
);

// Get user by ID (users can access their own profile, admins can access any profile)
export const getUserById = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    // Regular users can only access their own profile unless they're admin
    if (currentUserId !== id && currentUserRole !== "ADMIN") {
      return res
        .status(403)
        .json({
          message: "Access denied. You can only view your own profile.",
        });
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        lastLogin: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  },
);

// Update user by ID (users can update their own profile, admins can update any profile)
export const updateUser = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    // Regular users can only update their own profile unless they're admin
    if (currentUserId !== id && currentUserRole !== "ADMIN") {
      return res
        .status(403)
        .json({
          message: "Access denied. You can only update your own profile.",
        });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // email is intentionally omitted here to prevent it from being updated.
    const {
      firstName,
      lastName,
      phoneNumber,
      profilePicture,
      companyName,
      companyRole,
      address,
      city,
      state,
      country,
    } = req.body;

    // Regular users cannot update role or emailVerified, only admins can
    if (
      req.user?.role !== "ADMIN" &&
      (req.body.role || req.body.emailVerified)
    ) {
      return res
        .status(403)
        .json({
          message:
            "Access denied. Only admins can update role or email verification status.",
        });
    }

    // Prepare update data - only include fields that are present
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (profilePicture !== undefined)
      updateData.profilePicture = profilePicture;
    if (req.user?.role === "ADMIN" && req.body.role !== undefined)
      updateData.role = req.body.role;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (companyRole !== undefined) updateData.companyRole = companyRole;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (req.user?.role === "ADMIN" && req.body.emailVerified !== undefined)
      updateData.emailVerified = req.body.emailVerified;

    const updatedUser = await prisma.user.update({
      where: { id },
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
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  },
);

// Delete user by ID (admin only)
export const deleteUser = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user (Prisma will handle cascade deletions based on schema)
    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({ message: "User deleted successfully" });
  },
);

// Get all users (admin only)
export const getAllUsers = asyncMiddleware(
  async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
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
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        emailVerified: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ users, count: users.length });
  },
);

// Search users (authenticated users)
export const searchUsers = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { query } = req.query;
    const currentUserId = req.user?.id;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } }, // Exclude current user
          {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        companyName: true,
        companyRole: true,
      },
      take: 10, // Limit results
    });

    res.status(200).json({ users });
  },
);

// Reset user lockout (admin only)
export const resetUserLockout = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserRole = req.user?.role;

    // Only admins can reset lockouts
    if (currentUserRole !== "ADMIN") {
      return res
        .status(403)
        .json({
          message: "Access denied. Admins only.",
        });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Reset lockout
    await prisma.user.update({
      where: { id },
      data: {
        loginAttempts: 0,
        lockoutUntil: null,
      },
    });

    res.status(200).json({
      message: `User lockout reset for ${user.email}`,
    });
  }
);

