import { Server } from 'socket.io';
import { DashboardStats } from './dashboardStats';

let ioInstance: Server | null = null;

export function setDashboardIO(io: Server): void {
  ioInstance = io;
}

export function getDashboardIO(): Server | null {
  return ioInstance;
}

export function emitDashboardStatsUpdate(userId: string, stats: DashboardStats): void {
  if (ioInstance) {
    ioInstance.to(`dashboard:${userId}`).emit('dashboard:stats:update', {
      ...stats,
      timestamp: new Date().toISOString(),
    });
  }
}
