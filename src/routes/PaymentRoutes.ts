import { Router } from 'express';
import {
    initializeProjectPayment,
    getProjectPaymentStatus,
    getProjectPaymentHistory,
} from '../controller/PaymentController';
import { authenticateUser } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Project payment processing
 */

/**
 * @swagger
 * /payments/projects/{projectId}/initialize:
 *   post:
 *     summary: Initialize project down payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
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
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment initialized
 */
router.post(
    '/projects/:projectId/initialize',
    authenticateUser,
    initializeProjectPayment
);

/**
 * @swagger
 * /payments/projects/{projectId}/status:
 *   get:
 *     summary: Get user's payment status for a project
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status retrieved
 */
router.get(
    '/projects/:projectId/status',
    authenticateUser,
    getProjectPaymentStatus
);

/**
 * @swagger
 * /payments/projects/{projectId}/history:
 *   get:
 *     summary: Get payment history for a project
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment history retrieved
 */
router.get(
    '/projects/:projectId/history',
    authenticateUser,
    getProjectPaymentHistory
);

export default router;
