import { Router } from "express";
import { authenticateUser } from "../middleware/authMIddleware";
import { updateUserProfile } from "../controller/UserProfileController";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Update current user's profile (specifically for profile picture and other user details with Cloudinary upload)
router.put("/", updateUserProfile);

export default router; 