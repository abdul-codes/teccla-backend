import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import {
    initializeTransaction,
    verifyTransaction,
    generateReference,
} from '../utils/paystack';
import { asyncMiddleware } from '../middleware/asyncMiddleware';
import {
    FIXED_PAYMENT_AMOUNT_KOBO,
    FIXED_PAYMENT_DESCRIPTION,
} from '../config/paymentConfig';

// Initialize payment with fixed amount
export const initializePayment = asyncMiddleware(
    async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;

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

            const reference = generateReference();
            const callbackUrl = `${process.env.FRONTEND_URL}/payment/verify`;

            await prisma.payment.create({
                data: {
                    userId,
                    paystackReference: reference,
                    amount: FIXED_PAYMENT_AMOUNT_KOBO,
                    description: FIXED_PAYMENT_DESCRIPTION,
                    status: 'PENDING',
                },
            });

            const paystackData = await initializeTransaction(
                user.email,
                FIXED_PAYMENT_AMOUNT_KOBO,
                reference,
                callbackUrl
            );

            return res.status(200).json({
                success: true,
                message: 'Payment initialized',
                data: {
                    authorization_url: paystackData.authorization_url,
                    reference: paystackData.reference,
                },
            });
        } catch (error) {
            console.error('Payment initialization error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to initialize payment',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * Verify payment after user returns from Paystack
 * Called by frontend with reference from URL
 */
export const verifyPayment = asyncMiddleware(
    async (req: Request, res: Response) => {
        try {
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
        } catch (error) {
            console.error('Payment verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify payment',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * Get payment history for current user
 */
export const getPaymentHistory = asyncMiddleware(
    async (req: Request, res: Response) => {
        try {
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
        } catch (error) {
            console.error('Payment history error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch payment history',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);
