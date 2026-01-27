import { prisma } from './db';

export interface DashboardStats {
  myProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalConversations: number;
  unreadMessages: number;
  messagesToday: number;
}

export interface AdminDashboardStats extends DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalRevenue: number;
  pendingPayments: number;
}

export async function calculateUserDashboardStats(userId: string): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    projects,
    activeProjects,
    completedProjects,
    conversations,
    unreadMessages,
    messagesToday,
  ] = await Promise.all([
    prisma.project.count({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
    }),
    prisma.project.count({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
        status: 'IN_PROGRESS',
      },
    }),
    prisma.project.count({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
        status: 'COMPLETED',
      },
    }),
    prisma.conversationParticipant.count({
      where: { userId },
    }),
    prisma.message.count({
      where: {
        conversation: {
          participants: { some: { userId } },
        },
        createdAt: { gte: todayStart },
        senderId: { not: userId },
      },
    }),
    prisma.message.count({
      where: {
        senderId: userId,
        createdAt: { gte: todayStart },
      },
    }),
  ]);

  const unreadCount = await prisma.messageRead.count({
    where: {
      userId,
      message: {
        conversation: {
          participants: { some: { userId } },
        },
        createdAt: { gte: todayStart },
      },
    },
  });

  return {
    myProjects: projects,
    activeProjects,
    completedProjects,
    totalConversations: conversations,
    unreadMessages: unreadCount,
    messagesToday,
  };
}

export async function calculateAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    totalUsers,
    totalProjects,
    totalRevenueResult,
    pendingPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCESS' },
    }),
    prisma.payment.count({
      where: { status: 'PENDING' },
    }),
  ]);

  return {
    myProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalConversations: 0,
    unreadMessages: 0,
    messagesToday: 0,
    totalUsers,
    totalProjects,
    totalRevenue: totalRevenueResult._sum.amount || 0,
    pendingPayments,
  };
}
