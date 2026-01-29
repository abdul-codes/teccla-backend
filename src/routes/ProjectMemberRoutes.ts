import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import {
  requestJoinProject,
  getPendingRequests,
  approveMember,
  rejectMember,
  leaveProject,
  getProjectMembers,
  getMyProjects,
  removeUserFromProject,
  updateMemberStatus,
  inviteUserToProject,
} from "../controller/ProjectMemberController";

const router = Router();

/**
 * @swagger
 * /projects/{id}/request-join:
 *   post:
 *     summary: Request to join a project (requires payment)
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
 *               - reference
 *               - amount
 *             properties:
 *               reference:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Join request submitted
 */
router.post('/:projectId/request-join', authenticateUser, requestJoinProject);

/**
 * @swagger
 * /projects/{id}/pending:
 *   get:
 *     summary: Get pending join requests (owner/admin only)
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
 *         description: List of pending requests
 */
router.get('/:projectId/pending', authenticateUser, getPendingRequests);

/**
 * @swagger
 * /projects/{id}/approve/{userId}:
 *   patch:
 *     summary: Approve a join request (adds to chat automatically)
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Member approved
 */
router.patch('/:projectId/approve/:userId', authenticateUser, approveMember);

/**
 * @swagger
 * /projects/{id}/reject/{userId}:
 *   patch:
 *     summary: Reject a join request
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Request rejected
 */
router.patch('/:projectId/reject/:userId', authenticateUser, rejectMember);

/**
 * @swagger
 * /projects/{id}/invite:
 *   post:
 *     summary: Invite a user to a project (auto-approve + auto-add chat)
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
 *       201:
 *         description: User invited
 */
router.post('/:projectId/invite', authenticateUser, inviteUserToProject);

/**
 * @swagger
 * /projects/{id}/leave:
 *   post:
 *     summary: Leave a project
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Left project
 */
router.post('/:projectId/leave', authenticateUser, leaveProject);

/**
 * @swagger
 * /projects/{id}/members:
 *   get:
 *     summary: Get all members of a project
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of project members
 */
router.get('/:projectId/members', authenticateUser, getProjectMembers);

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

/**
 * @swagger
 * /project-members/{projectId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a project
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/:projectId/members/:userId', authenticateUser, removeUserFromProject);

/**
 * @swagger
 * /project-members/{projectId}/members/{userId}:
 *   patch:
 *     summary: Update a member's status
 *     tags: [Project Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:projectId/members/:userId', authenticateUser, updateMemberStatus);

export default router;
