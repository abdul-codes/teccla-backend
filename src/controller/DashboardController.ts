import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { calculateUserDashboardStats, calculateAdminDashboardStats } from "../utils/dashboardStats";

export const getDashboardStats = asyncMiddleware(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const isAdmin = (req as any).user?.role === "ADMIN";

    let stats;
    if (isAdmin) {
      stats = await calculateAdminDashboardStats();
    } else {
      stats = await calculateUserDashboardStats(userId);
    }

    res.status(200).json({
      success: true,
      data: stats,
    });
  }
);
