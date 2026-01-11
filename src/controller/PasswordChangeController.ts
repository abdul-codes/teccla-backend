import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import bcrypt from "bcryptjs";
import { sendPasswordChangedEmail } from "../utils/Mail";

// Change password (authenticated users)
export const changePassword = asyncMiddleware(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    // Find user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens (force re-login on all devices)
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    // Send confirmation email
    await sendPasswordChangedEmail(user.email, `${user.firstName} ${user.lastName}`);

    res.status(200).json({
      message: "Password changed successfully. Please login with your new password",
    });
  }
);

