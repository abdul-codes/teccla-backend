import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/db";
import crypto from "crypto";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "../utils/Mail";
import bcrypt from "bcryptjs";

const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const forgotPassword = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    // Find user (don't reveal if not found)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success, even if user doesn't exist (security)
    // This prevents email enumeration attacks
    if (!user) {
      return res.status(200).json({
        message: "If an account with this email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetLink, `${user.firstName} ${user.lastName}`);

    res.status(200).json({
      message: "Password reset link sent to your email",
    });
  }
);

export const resetPassword = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { token, newPassword, confirmPassword } = req.body;

    // Validation
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Token, new password, and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return res.status(400).json({
        message: "Reset token has expired. Please request a new one",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.user.id },
      data: {
        password: hashedPassword,
        loginAttempts: 0,
        lockoutUntil: null,
      },
    });

    // Delete used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    // Revoke all refresh tokens (force re-login)
    await prisma.refreshToken.updateMany({
      where: { userId: resetToken.user.id },
      data: { revoked: true },
    });

    // Send confirmation email
    await sendPasswordChangedEmail(resetToken.user.email, `${resetToken.user.firstName} ${resetToken.user.lastName}`);

    res.status(200).json({
      message: "Password reset successful. Please login with your new password",
    });
  }
);

