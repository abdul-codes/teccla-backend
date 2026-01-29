import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import {
    initializeTransaction,
    verifyTransaction,
    generateReference,
} from '../utils/paystack';
import { asyncMiddleware } from '../middleware/asyncMiddleware';

// Initialize project-based payment
export const initializeProjectPayment = asyncMiddleware(
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { amount } = req.body as { amount: number };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                title: true,
                totalPrice: true,
                downPaymentPercentage: true,
                createdBy: { select: { email: true } },
            },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }

        if (!project.totalPrice) {
            return res.status(400).json({
                success: false,
                message: 'Project pricing not set',
            });
        }

        const expectedAmount = Math.round(project.totalPrice * project.downPaymentPercentage * 100);
        if (amount < expectedAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum payment is ₦${(expectedAmount / 100).toLocaleString()}`,
            });
        }

        const reference = generateReference();
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const callbackUrl = `${frontendUrl}/projects/${projectId}/join/verify?reference=${reference}`;

        await prisma.payment.create({
            data: {
                userId,
                projectId,
                paystackReference: reference,
                amount,
                description: `Down payment for ${project.title}`,
                status: 'PENDING',
            },
        });

        const paystackData = await initializeTransaction(
            user.email,
            amount,
            reference,
            callbackUrl
        );

        return res.status(200).json({
            success: true,
            message: 'Payment initialized',
            data: {
                authorization_url: paystackData.authorization_url,
                reference: paystackData.reference,
                amount,
                projectId,
                projectTitle: project.title,
            },
        });
    }
);

// Get project payment status
export const getProjectPaymentStatus = asyncMiddleware(
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { projectId } = req.params;

        const membership = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
            select: {
                status: true,
                paymentReference: true,
                joinedAt: true,
            },
        });

        if (!membership) {
            return res.status(404).json({
                success: false,
                message: 'No request found',
            });
        }

        const payments = await prisma.payment.findMany({
            where: { userId, projectId },
            orderBy: { createdAt: 'desc' },
            take: 1,
        });

        return res.status(200).json({
            success: true,
            data: {
                status: membership.status,
                paymentReference: membership.paymentReference,
                lastPayment: payments[0] || null,
            },
        });
    }
);

// Get project payment history
export const getProjectPaymentHistory = asyncMiddleware(
    async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { projectId } = req.params;

        const payments = await prisma.payment.findMany({
            where: { userId, projectId },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({
            success: true,
            message: 'Project payment history retrieved',
            data: { payments },
        });
    }
);

/**
 * Verify payment after user returns from Paystack
 * Called by frontend with reference from URL
 */
export const verifyPayment = asyncMiddleware(
    async (req: Request, res: Response) => {
        const { reference } = req.params;

        const payment = await prisma.payment.findUnique({
            where: { paystackReference: reference },
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
        }

        // Security check: Ensure user owns the payment
        if (payment.userId !== req.user!.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to payment',
            });
        }

        if (payment.status === 'SUCCESS') {
            return res.status(200).json({
                success: true,
                message: 'Payment already verified',
                data: { payment },
            });
        }

        const paystackData = await verifyTransaction(reference);

        const updatedPayment = await prisma.payment.update({
            where: { paystackReference: reference },
            data: {
                status: paystackData.status === 'success' ? 'SUCCESS' : 'FAILED',
                channel: paystackData.channel,
                cardType: paystackData.authorization?.card_type,
                paidAt: paystackData.status === 'success' && paystackData.paid_at
                    ? new Date(paystackData.paid_at)
                    : null,
            },
        });

        return res.status(200).json({
            success: paystackData.status === 'success',
            message: paystackData.status === 'success'
                ? 'Payment verified successfully'
                : 'Payment verification failed',
            data: { payment: updatedPayment },
        });
    }
);

/**
 * Get payment history for current user
 */
export const getPaymentHistory = asyncMiddleware(
    async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const payments = await prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({
            success: true,
            message: 'Payment history retrieved',
            data: { payments },
        });
    }
);

