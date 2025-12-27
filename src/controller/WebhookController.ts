import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { verifyWebhookSignature } from '../utils/paystack';

/**
 * Handle Paystack webhook events
 * Called by Paystack when payment events occur
 */
export const handlePaystackWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-paystack-signature'] as string;
        const rawBody = JSON.stringify(req.body);

        if (!verifyWebhookSignature(signature, rawBody)) {
            console.warn('Invalid webhook signature received');
            return res.sendStatus(400);
        }

        const event = req.body;
        console.log(`Webhook received: ${event.event}`);

        if (event.event === 'charge.success') {
            const { reference, status, channel, authorization, paid_at } = event.data;

            await prisma.payment.updateMany({
                where: { paystackReference: reference },
                data: {
                    status: status === 'success' ? 'SUCCESS' : 'FAILED',
                    channel,
                    cardType: authorization?.card_type,
                    paidAt: paid_at ? new Date(paid_at) : null,
                },
            });

            console.log(`Payment ${reference} updated via webhook`);
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        return res.sendStatus(500);
    }
};
