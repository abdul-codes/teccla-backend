import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import Logger from "../utils/logger";

const ACCESS_TOKEN = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_TOKEN || !REFRESH_TOKEN) {
  throw new Error('JWT secrets not configured. Required: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET');
}

export const refreshToken = asyncMiddleware(async (req: Request, res: Response) => {
  // Read refreshToken from HttpOnly cookie
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found in cookie' });
  }

  // Wrap entire operation in a transaction to prevent race conditions
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if refresh token exists and is revoked
      const tokenRecord = await tx.refreshToken.findFirst({
        where: { token: refreshToken }
      });

      if (tokenRecord && tokenRecord.revoked) {
        throw new Error('TOKEN_REVOKED');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN) as { id: string };

      // Find user within transaction
      const user = await tx.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user.id, user.role);
      const newRefreshToken = generateRefreshToken(user.id);

      // Blacklist old refresh token if it exists
      if (tokenRecord) {
        await tx.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revoked: true }
        });
      }

      // Create new refresh token record within same transaction
      await tx.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
        }
      });

      return { newAccessToken, newRefreshToken };
    });

    // Set new refresh token in an HttpOnly cookie (outside transaction)
    res.cookie('refreshToken', result.newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Send only the new access token in the response body
    return res.json({
      message: 'Token refreshed successfully',
      accessToken: result.newAccessToken,
    });

  } catch (error) {
    // Handle specific transaction errors
    if (error instanceof Error) {
      if (error.message === 'TOKEN_REVOKED') {
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });
        return res.status(401).json({ message: 'Token has been revoked' });
      }
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
    }

    // Handle JWT verification errors
    if (error instanceof jwt.JsonWebTokenError) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    Logger.error('Token refresh error:', error);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
});
