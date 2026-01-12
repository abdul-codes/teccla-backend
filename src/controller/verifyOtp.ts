import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/db";
import Logger from "../utils/logger";

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const verifyOtp = asyncMiddleware(async (req: Request, res: Response) => {
  const { email, token } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { OtpVerification: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerified) {
    return res.status(400).json({ error: 'Already verified' });
  }

  // Check if user is locked out from OTP attempts
      const otpAttempts = await prisma.otpAttempts.findUnique({
        where: { userId: user.id }
      });

      // Check if user is locked out from OTP attempts
      const timeSinceLastTry = Date.now() - otpAttempts.lastTry.getTime();

      if (otpAttempts.attempts >= MAX_OTP_ATTEMPTS && timeSinceLastTry < OTP_LOCK_TIME_MS) {
        const remainingMinutes = Math.ceil((OTP_LOCK_TIME_MS - timeSinceLastTry) / 60000);
        return res.status(429).json({
          error: `Too many failed attempts. Try again in ${remainingMinutes} minutes`
        });
      }

      // Reset attempts if lockout period has expired
      if (otpAttempts.attempts >= MAX_OTP_ATTEMPTS && timeSinceLastTry >= OTP_LOCK_TIME_MS) {
      await prisma.otpAttempts.update({
        where: { userId: user.id },
        data: { attempts: 0, lastTry: undefined }
      });
      }
   });

    // Reset attempts if lockout period has expired
    if (otpAttempts.attempts >= MAX_OTP_ATTEMPTS && timeSinceLastTry >= OTP_LOCK_TIME_MS) {
      await prisma.otpAttempts.update({
        where: { userId: user.id },
        data: { attempts: 0, lastTry: undefined }
      });
    }
  }

  // Find valid OTP
  const otpVerificationToken = await prisma.otpVerification.findFirst({
    where: {
      otp: token as string,
      userId: user.id
    },
  });

  if (!otpVerificationToken) {
    // Increment attempt count
    const currentAttempts = (otpAttempts?.attempts || 0) + 1;

    await prisma.otpAttempts.upsert({
      where: { userId: user.id },
      update: {
        attempts: currentAttempts,
        lastTry: new Date()
      },
      create: {
        userId: user.id,
        attempts: currentAttempts,
        lastTry: new Date()
      }
    });

    const attemptsRemaining = MAX_OTP_ATTEMPTS - currentAttempts;
    const isLastAttempt = attemptsRemaining <= 0;

    return res.status(400).json({
      error: 'Invalid token',
      attemptsRemaining: isLastAttempt ? 0 : attemptsRemaining,
      lockedUntil: isLastAttempt ? new Date(Date.now() + OTP_LOCK_TIME_MS).toISOString() : null
    });
  }

  if (otpVerificationToken.expires < new Date()) {
    await prisma.otpVerification.delete({ where: { id: otpVerificationToken.id } });
    return res.status(400).json({ error: 'Token expired' });
  }

  // Success: Verify email and clear attempts
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  // Delete all OTPs and attempts
  await prisma.otpVerification.deleteMany({ where: { userId: user.id } });
  await prisma.otpAttempts.deleteMany({ where: { userId: user.id } });

  res.status(200).json({ message: 'Email verified successfully' });
});
