import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { getDashboardStats } from "../controller/DashboardController";

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: User and admin dashboard statistics
 */

const router = Router();

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     myProjects:
 *                       type: number
 *                     activeProjects:
 *                       type: number
 *                     completedProjects:
 *                       type: number
 *                     totalConversations:
 *                       type: number
 *                     unreadMessages:
 *                       type: number
 *                     messagesToday:
 *                       type: number
 */
router.get("/stats", authenticateUser, getDashboardStats);

export default router;
