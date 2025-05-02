import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { asyncMiddleware } from "./asyncMiddleware";
import { prisma } from "../utils/db";


const ACCESS_TOKEN = process.env.ACCESS_TOKEN as string;


declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      }
    }
  }
}

export const authenticateUser = asyncMiddleware( async(
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.header("Authorization");
      const token = req.header("Authorization")?.replace("Bearer ", "");
  
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
  

export const authorizeAdmin = asyncMiddleware( async(req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
});


// Role-based Authorization Middleware
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied' 
      });
    }
    next();
  };
};