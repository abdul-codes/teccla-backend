import { Router } from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware";
import { getAllUsers, getUserById, updateUser, deleteUser, getCurrentUser, searchUsers, resetUserLockout } from "../controller/UserController";
import { changePassword } from "../controller/PasswordChangeController";
import { UserRole } from "../../prisma/generated/prisma/client";
import { changePasswordValidation } from "../validation/validation";
import { validateSchema } from "../middleware/validateMiddleware";
import { updateUserSchema, searchUsersSchema } from "../validation/user";

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and search
 */

const router = Router()

// Admin routes
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", authenticateUser, authorizeRoles(UserRole.ADMIN), getAllUsers)
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete("/:id", authenticateUser, authorizeRoles(UserRole.ADMIN), deleteUser)
/**
 * @swagger
 * /users/{id}/reset-lockout:
 *   post:
 *     summary: Reset user lockout (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lockout reset successful
 */
router.post("/:id/reset-lockout", authenticateUser, authorizeRoles(UserRole.ADMIN), resetUserLockout)

// User routes (authenticated users)
/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search for users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get("/search", authenticateUser, validateSchema(searchUsersSchema, 'query'), searchUsers)
/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data
 */
router.get("/profile", authenticateUser, getCurrentUser)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 */
router.get("/:id", authenticateUser, getUserById)

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user data
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put("/:id", authenticateUser, validateSchema(updateUserSchema), updateUser)

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post("/change-password", authenticateUser, changePasswordValidation, changePassword)

export default router;