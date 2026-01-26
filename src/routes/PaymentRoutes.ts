import { Router } from 'express';
import {
    initializePayment,
    verifyPayment,
    getPaymentHistory,
} from '../controller/PaymentController';
import { authenticateUser } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and history
 */

/**
 * @swagger
 * /payments/initialize:
 *   post:
 *     summary: Initialize a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 */
router.post('/initialize', authenticateUser, initializePayment);

/**
 * @swagger
 * /payments/verify/{reference}:
 *   get:
 *     summary: Verify a payment by reference
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */
router.get('/verify/:reference', authenticateUser, verifyPayment);

/**
 * @swagger
 * /payments/history:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */
router.get('/history', authenticateUser, getPaymentHistory);

export default router;
