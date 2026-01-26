import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { getUserProfile, updateUserProfile } from "../controller/UserProfileController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile management
 */

// All routes require authentication
router.use(authenticateUser);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data retrieved successfully
 */
router.get("/", getUserProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put("/", updateUserProfile);

export default router; 