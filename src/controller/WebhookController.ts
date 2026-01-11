import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { verifyWebhookSignature } from '../utils/paystack';
import { asyncMiddleware } from '../middleware/asyncMiddleware';
import Logger from '../utils/logger';


/**
 * Handle Paystack webhook events
 * Called by Paystack when payment events occur
 */
export const handlePaystackWebhook = asyncMiddleware(async (req: Request, res: Response) => {
    const signature = req.headers['x-paystack-signature'] as string;
    // @ts-ignore
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);

    if (!verifyWebhookSignature(signature, rawBody)) {
        Logger.warn('Invalid webhook signature received');
        return res.sendStatus(400);
    }

    const event = req.body;
    Logger.info(`Webhook received: ${event.event}`, { reference: event.data?.reference });

    if (event.event === 'charge.success' || event.event === 'charge.failed') {
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

        Logger.info(`Payment ${reference} updated to ${status} via webhook`);
    }

    return res.sendStatus(200);
});

