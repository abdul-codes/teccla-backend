import { Server, Socket } from 'socket.io';
import { calculateUserDashboardStats, DashboardStats } from '../../utils/dashboardStats';
import Logger from '../../utils/logger';
import { emitDashboardStatsUpdate } from '../../utils/dashboardEmitter';

interface DashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
}

export function initializeDashboardHandlers(io: Server) {
  io.on('connection', (socket: Socket & { user?: DashboardUser }) => {
    const userId = socket.user?.id;
    const userName = socket.user ? `${socket.user.firstName} ${socket.user.lastName}` : 'Unknown';

    if (!userId) {
      return;
    }

    Logger.info(`Dashboard: User ${userName} connected to dashboard socket`);

    socket.on('dashboard:subscribe', () => {
      socket.join(`dashboard:${userId}`);
      Logger.debug(`Dashboard: User ${userId} subscribed to dashboard updates`);

      socket.emit('dashboard:subscribed', {
        userId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('dashboard:unsubscribe', () => {
      socket.leave(`dashboard:${userId}`);
      Logger.debug(`Dashboard: User ${userId} unsubscribed from dashboard updates`);
    });

    socket.on('dashboard:request_stats', async () => {
      try {
        const stats = await calculateUserDashboardStats(userId);
        socket.emit('dashboard:stats:update', stats);
      } catch (error) {
        Logger.error('Dashboard: Error calculating stats for request:', error);
        socket.emit('dashboard:error', { message: 'Failed to fetch dashboard stats' });
      }
    });
  });
}

export async function broadcastDashboardUpdate(
  io: Server,
  userId: string,
  updateType: 'stats',
  data: DashboardStats
): Promise<void> {
  try {
    io.to(`dashboard:${userId}`).emit(`dashboard:${updateType}:update`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    Logger.debug(`Dashboard: Broadcast ${updateType} update to user ${userId}`);
  } catch (error) {
    Logger.error(`Dashboard: Failed to broadcast ${updateType} update:`, error);
  }
}
