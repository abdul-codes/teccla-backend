import { Router } from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMIddleware";
import { getAllUsers, getUserById, updateUser, deleteUser, getCurrentUser, searchUsers } from "../controller/UserController";
import { UserRole } from "../../prisma/generated/prisma/client";


const router = Router()

// Admin routes
router.get("/", authenticateUser, authorizeRoles(UserRole.ADMIN), getAllUsers)
router.delete("/:id", authenticateUser, authorizeRoles(UserRole.ADMIN), deleteUser)

// User routes (authenticated users)
router.get("/search", authenticateUser, searchUsers) // Search users
router.get("/profile", authenticateUser, getCurrentUser) // Get current user's profile
router.get("/:id", authenticateUser, getUserById) // Get any user's profile by ID (for users to see others' profiles)
router.put("/:id", authenticateUser, updateUser) // Update user profile by ID (users can update their own)

export default router;