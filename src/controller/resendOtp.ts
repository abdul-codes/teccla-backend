import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { generateOtp } from "../utils/generateOtp";
import { sendOTP } from "../utils/Mail";

const RESEND_LIMIT = 3;
const RESEND_WINDOW_MINUTES = 15;

export const resendOtp = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const { email } = req.body


    const user = await prisma.user.findUnique({
      where: { email },
      include: { OtpVerification: true, OtpAttempt: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.emailVerified) return res.status(400).json({ error: 'Already verified' });

    await prisma.otpVerification.deleteMany({
      where: { userId: user.id },
    });

    if (user.OtpAttempt) {
      const timeSinceLast = Date.now() - user.OtpAttempt.lastTry.getTime()
      const minutesSinceLast = Math.floor(timeSinceLast / 1000 / 60);

      if (user.OtpAttempt.attempts >= RESEND_LIMIT &&
        minutesSinceLast < RESEND_WINDOW_MINUTES) {
        return res.status(429).json({
          message: `Maximum resend attempts reached. Try again in ${RESEND_WINDOW_MINUTES - minutesSinceLast
            } minutes`
        });
      }
    }

    // upsert updates or create a new instance if not available

    await prisma.otpAttempts.upsert({
      where: { userId: user.id },
      update: { attempts: { increment: 1 }, lastTry: new Date() },

      create: { userId: user.id, attempts: 1, lastTry: new Date() }

    })

    // Verify email
    const otp = generateOtp()
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpVerification.create({
      data: { otp, expires, userId: user.id }
    })

    await sendOTP(email, otp)

    res.status(201).json({ message: 'New OTP sent to email' });

  } catch {
    res.status(500).json({ error: 'Failed to resend OTP' });

  }
})