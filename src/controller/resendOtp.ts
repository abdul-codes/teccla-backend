import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { generateOtp } from "../utils/generateOtp";
import { sendOTP } from "../utils/Mail";

const RESEND_LIMIT = 3; // Maximum number of resend attempts
const RESEND_WINDOW_MINUTES = 15; // Time window for resend attempts

export const resendOtp = asyncMiddleware(async (req: Request, res: Response) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { OtpVerification: true, OtpAttempts: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.emailVerified) return res.status(400).json({ error: 'Already verified' });

  await prisma.otpVerification.deleteMany({
    where: { userId: user.id },
  });

  if (user.OtpAttempts) {
    const timeSinceLast = Date.now() - user.OtpAttempts.lastTry.getTime()
    const minutesSinceLast = Math.floor(timeSinceLast / 1000 / 60);

    if (user.OtpAttempts.attempts >= RESEND_LIMIT &&
      minutesSinceLast < RESEND_WINDOW_MINUTES) {
      return res.status(429).json({
        message: `Maximum resend attempts reached. Try again in ${RESEND_WINDOW_MINUTES - minutesSinceLast
          } minutes`
      });
    }

    // Update or create OtpAttempts
    await prisma.otpAttempts.upsert({
      where: { userId: user.id },
      update: {
        attempts: user.OtpAttempts.attempts + 1,
        lastTry: new Date(),
      },
      create: {
        userId: user.id,
        attempts: 1,
        lastTry: new Date(),
      },
    });
  } else {
    // Create new OtpAttempts if none exists
    await prisma.otpAttempts.create({
      data: {
        userId: user.id,
        attempts: 1,
        lastTry: new Date(),
      },
    });
  }

  // Generate and save new OTP
  const otp = generateOtp();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      otp,
      expires,
    },
  });

  // Send OTP email
  await sendOTP(email, otp);

  res.status(200).json({ message: 'OTP resent successfully' });
});