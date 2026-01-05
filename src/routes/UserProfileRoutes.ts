import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { getUserProfile, updateUserProfile } from "../controller/UserProfileController";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Get current user's profile
router.get("/", getUserProfile);

// Update current user's profile (specifically for profile picture and other user details with Cloudinary upload)
router.put("/", updateUserProfile);

export default router; 