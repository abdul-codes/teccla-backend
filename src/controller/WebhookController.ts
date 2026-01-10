import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { verifyWebhookSignature } from '../utils/paystack';

export const handlePaystackWebhook = async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-paystack-signature'] as string;
        // @ts-ignore
        const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);

        if (!verifyWebhookSignature(signature, rawBody)) {
            console.warn('Invalid webhook signature received');
            return res.sendStatus(400);
        }

        const event = req.body;
        console.log(`Webhook received: ${event.event}`);

        if (event.event === 'charge.success' || event.event === 'charge.failed') {
            const { reference, status, channel, authorization, paid_at } = event.data;

            const payment = await prisma.payment.findUnique({
                where: { paystackReference: reference },
                select: {
                    id: true,
                    status: true,
                    userId: true,
                    projectMemberId: true,
                    milestoneType: true,
                    projectId: true,
                    amount: true,
                },
            });

            if (!payment) {
                console.warn(`Payment with reference ${reference} not found`);
                return res.sendStatus(404);
            }

            if (payment.status === 'SUCCESS') {
                console.log(`Payment ${reference} already verified`);
                return res.sendStatus(200);
            }

            let memberStatus: string | null = null;
            if (status === 'success' && payment.projectMemberId && payment.milestoneType) {
                if (payment.milestoneType === 'DOWN_PAYMENT') {
                    memberStatus = 'PAID_DOWN';
                } else if (payment.milestoneType === 'COMPLETION') {
                    const member = await prisma.projectMember.findUnique({
                        where: { id: payment.projectMemberId },
                        select: { status: true },
                    });

                    if (member?.status === 'PAID_DOWN') {
                        memberStatus = 'PAID_COMPLETION';
                    } else {
                        memberStatus = 'PAID_FULL';
                    }
                }

                if (memberStatus) {
                    await prisma.projectMember.update({
                        where: { id: payment.projectMemberId },
                        data: { status: memberStatus as any },
                    });
                }

                if (payment.projectId && payment.milestoneType) {
                    await prisma.projectPayment.update({
                        where: {
                            projectId_milestoneType: {
                                projectId: payment.projectId,
                                milestoneType: payment.milestoneType,
                            },
                        },
                        data: {
                            totalCollected: {
                                increment: payment.amount / 100,
                            },
                            numberOfPayments: {
                                increment: 1,
                            },
                        },
                    });
                }

                if (payment.projectId && payment.milestoneType === 'DOWN_PAYMENT') {
                    const existingConversation = await prisma.conversation.findUnique({
                        where: { projectId: payment.projectId },
                    });

                    if (!existingConversation) {
                        const project = await prisma.project.findUnique({
                            where: { id: payment.projectId },
                            select: { title: true },
                        });

                        const conversation = await prisma.conversation.create({
                            data: {
                                name: project?.title || 'Project Group Chat',
                                isGroup: true,
                                projectId: payment.projectId,
                                createdBy: payment.userId,
                            },
                        });

                        await prisma.conversationParticipant.create({
                            data: {
                                conversationId: conversation.id,
                                userId: payment.userId,
                                role: 'ADMIN',
                            },
                        });
                    }
                }
            }

            await prisma.payment.update({
                where: { paystackReference: reference },
                data: {
                    status: status === 'success' ? 'SUCCESS' : 'FAILED',
                    channel,
                    cardType: authorization?.card_type,
                    paidAt: paid_at ? new Date(paid_at) : null,
                },
            });

            console.log(`Payment ${reference} updated to ${status} via webhook`);
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        return res.sendStatus(500);
    }
};
