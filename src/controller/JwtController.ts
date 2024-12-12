import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import jwt from "jsonwebtoken"
import { prisma } from "../utils/db";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN  as string;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN  as string;

export const refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
  
      if (!refreshToken) {
        return res.status(401).json({ 
          message: 'Refresh token is required' 
        });
      }
  
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN) as { id: string };
  
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
  
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid refresh token' 
        });
      }
  
      // Generate new tokens
      const newAccessToken = generateAccessToken(user.id, user.role);
      const newRefreshToken = generateRefreshToken(user.id);
  
      res.json({
        message: 'Token refreshed successfully',
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ 
        message: 'Invalid or expired refresh token' 
      });
    }
  };