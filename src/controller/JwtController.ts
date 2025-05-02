import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import jwt from "jsonwebtoken"
import { prisma } from "../utils/db";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN as string;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN as string;

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Read refreshToken from HttpOnly cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        message: 'Refresh token not found in cookie'
      });
      return
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN) as { id: string };

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      res.status(401).json({
        message: 'Invalid refresh token'
      });
      return
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Set the new refresh token in an HttpOnly cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send only the new access token in the response body
    res.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      message: 'Invalid or expired refresh token'
    });
  }
};