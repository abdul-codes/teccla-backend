import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import {
  joinProject,
  leaveProject,
  getProjectMembers,
  getMyProjects,
  removeUserFromProject,
  updateMemberStatus,
  inviteUserToProject
} from "../controller/ProjectMemberController";

/**
 * @swagger
 * tags:
 *   name: Project Members
 *   description: Manage project membership and invites
 */

const router = Router();

// Project membership routes
/**
 * @swagger
 * /projects/{id}/join:
 *   post:
 *     summary: Join a project
 *     tags: [Project Members]
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
 *         description: Joined project successfully
 */
router.post('/:id/join', authenticateUser, joinProject);

/**
 * @swagger
 * /projects/{id}/invite:
 *   post:
 *     summary: Invite a user to a project
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER]
 *     responses:
 *       201:
 *         description: User invited successfully
 */
router.post('/:id/invite', authenticateUser, inviteUserToProject);

/**
 * @swagger
 * /projects/{id}/leave:
 *   post:
 *     summary: Leave a project
 *     tags: [Project Members]
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
 *         description: Left project successfully
 */
router.post('/:id/leave', authenticateUser, leaveProject);

/**
 * @swagger
 * /projects/{id}/members:
 *   get:
 *     summary: Get all members of a project
 *     tags: [Project Members]
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
 *         description: List of project members
 */
router.get('/:id/members', authenticateUser, getProjectMembers);

// User's projects
/**
 * @swagger
 * /project-members/my-projects:
 *   get:
 *     summary: Get all projects for current user
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's projects
 */
router.get('/my-projects', authenticateUser, getMyProjects);

// Admin/Owner management routes
/**
 * @swagger
 * /project-members/{projectId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a project
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete('/:projectId/members/:userId', authenticateUser, removeUserFromProject);

/**
 * @swagger
 * /project-members/{projectId}/members/{userId}:
 *   patch:
 *     summary: Update a member's status in a project
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member status updated
 */
router.patch('/:projectId/members/:userId', authenticateUser, updateMemberStatus);

export default router;
