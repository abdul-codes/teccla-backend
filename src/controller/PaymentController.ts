import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import {
    initializeTransaction,
    verifyTransaction,
    generateReference,
} from '../utils/paystack';
import { asyncMiddleware } from '../middleware/asyncMiddleware';

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
            const callbackUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/payment/verify`;

            await prisma.payment.create({
                data: {
                    userId,
                    paystackReference: reference,
                    amount: 0,
                    description: 'Legacy subscription payment',
                    status: 'PENDING',
                },
            });

            const paystackData = await initializeTransaction(
                user.email,
                0,
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

            let memberStatus: string | null = null;
            if (paystackData.status === 'success' && payment.projectMemberId && payment.milestoneType) {
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
                data: { payment: updatedPayment, memberStatus },
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

export const initializeProjectPayment = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params;
      const { milestoneType } = req.body;
      const userId = req.user!.id;

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            userId,
            projectId,
          },
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'You are not a member of this project',
        });
      }

      if (milestoneType === 'DOWN_PAYMENT' && member.status !== 'JOINED') {
        return res.status(400).json({
          success: false,
          message: 'You have already paid the down payment',
        });
      }

      if (milestoneType === 'COMPLETION') {
        if (member.status === 'JOINED') {
          return res.status(400).json({
            success: false,
            message: 'You must pay the down payment first',
          });
        }
        if (member.status === 'PAID_COMPLETION' || member.status === 'PAID_FULL') {
          return res.status(400).json({
            success: false,
            message: 'You have already paid the completion payment',
          });
        }
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          totalPrice: true,
          downPaymentPercentage: true,
          completionPercentage: true,
        },
      });

      if (!project || !project.totalPrice) {
        return res.status(404).json({
          success: false,
          message: 'Project pricing not set',
        });
      }

      let amountInNaira: number;
      if (milestoneType === 'DOWN_PAYMENT') {
        amountInNaira = (project.totalPrice * project.downPaymentPercentage) / 100;
      } else {
        amountInNaira = (project.totalPrice * project.completionPercentage) / 100;
      }

      const amountInKobo = Math.round(amountInNaira * 100);

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
      const callbackUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/payment/verify`;

      const payment = await prisma.payment.create({
        data: {
          userId,
          paystackReference: reference,
          amount: amountInKobo,
          description: `${milestoneType === 'DOWN_PAYMENT' ? 'Down Payment' : 'Completion Payment'} for Project`,
          status: 'PENDING',
          projectMemberId: member.id,
          milestoneType,
          projectId,
        },
      });

      const paystackData = await initializeTransaction(
        user.email,
        amountInKobo,
        reference,
        callbackUrl
      );

      return res.status(200).json({
        success: true,
        message: 'Payment initialized',
        data: {
          authorization_url: paystackData.authorization_url,
          reference: paystackData.reference,
          amount: amountInKobo,
          amountInNaira: amountInNaira,
          milestoneType,
        },
      });
    } catch (error) {
      console.error('Project payment initialization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export const getProjectPaymentHistory = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params;
      const userId = req.user!.id;

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            userId,
            projectId,
          },
        },
      });

      if (!member && req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view project payments',
        });
      }

      const payments = await prisma.payment.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          projectMember: {
            select: {
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        message: 'Project payment history retrieved',
        data: { payments },
      });
    } catch (error) {
      console.error('Get project payment history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve project payment history',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export const getMyPaymentProgress = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params;
      const userId = req.user!.id;

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            userId,
            projectId,
          },
        },
        include: {
          payments: true,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'You are not a member of this project',
        });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          totalPrice: true,
          downPaymentPercentage: true,
          completionPercentage: true,
        },
      });

      if (!project || !project.totalPrice) {
        return res.status(404).json({
          success: false,
          message: 'Project pricing not set',
        });
      }

      const downPaymentRequired = (project.totalPrice * project.downPaymentPercentage) / 100;
      const completionRequired = (project.totalPrice * project.completionPercentage) / 100;

      const downPayments = member.payments.filter(p => p.milestoneType === 'DOWN_PAYMENT' && p.status === 'SUCCESS');
      const completionPayments = member.payments.filter(p => p.milestoneType === 'COMPLETION' && p.status === 'SUCCESS');

      const downPaid = downPayments.reduce((sum, p) => sum + p.amount / 100, 0);
      const completionPaid = completionPayments.reduce((sum, p) => sum + p.amount / 100, 0);

      const totalPaid = downPaid + completionPaid;
      const totalRequired = downPaymentRequired + completionRequired;

      return res.status(200).json({
        success: true,
        message: 'Payment progress retrieved',
        data: {
          downPayment: {
            required: downPaymentRequired,
            paid: downPaid,
            status: downPaid >= downPaymentRequired ? 'PAID' : 'UNPAID',
          },
          completionPayment: {
            required: completionRequired,
            paid: completionPaid,
            status: completionPaid >= completionRequired ? 'PAID' : 'UNPAID',
          },
          totalPaid,
          totalRequired,
          remaining: totalRequired - totalPaid,
          memberStatus: member.status,
        },
      });
    } catch (error) {
      console.error('Get payment progress error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment progress',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
