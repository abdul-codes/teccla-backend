import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { asyncMiddleware } from "./asyncMiddleware";
import { prisma } from "../utils/db";
import { UserRole } from "../../prisma/generated/prisma/client";


const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  throw new Error('ACCESS_TOKEN environment variable not configured');
}


declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      }
    }
  }
}

export const authenticateUser = asyncMiddleware(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: "No token, authorization denied",
      });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN) as {
      id: string;
      role: string;
    };

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Invalid or expired access token" });
    } else {
      console.error("Authentication error:", error);
      res.status(500).json({ message: "Server error during authentication" });
    }
  }
});


export const authorizeAdmin = asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
});


// Role-based Authorization Middleware
export const authorizeRoles = (...allowedroles: UserRole[]) => {
  return asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedroles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    next();
  });
};