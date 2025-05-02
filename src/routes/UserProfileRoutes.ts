import { Router } from "express";
import { authenticateUser } from "../middleware/authMIddleware";
import { getUserProfile, updateUserProfile } from "../controller/UserProfileController";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Get user profile
router.get("/profile", getUserProfile);

// Update user profile
router.put("/profile", updateUserProfile);

export default router; 