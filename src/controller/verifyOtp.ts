import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/db";

export const verifyOtp = asyncMiddleware(async (req: Request, res: Response) => {
    try {
      const { email, token } = req.body
  
      const user = await prisma.user.findUnique({
        where: { email },
        include: { OtpVerification: true },
      });
  
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.emailVerified) return res.status(400).json({ error: 'Already verified' });
  
      const otpVerificationToken = await prisma.otpVerification.findFirst({
        where: { 
          otp: token as string,
          userId: user.id
        },
      })
  
  
      if (!otpVerificationToken) {
        return res.status(400).json({ error: 'Invalid token' })
      }
      if (otpVerificationToken.expires < new Date()) {
        await prisma.otpVerification.delete({ where: { id: otpVerificationToken.id } });
        return res.status(400).json({ error: 'Token expired' });
      }
  
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
  
      // Delete existing OTPs
      await prisma.otpVerification.deleteMany({
        where: { userId: user.id },
      });
  
      res.status(200).json({ message: 'Email verified successfully' });
  
  
    } catch (error) {
      // if (error instanceof Error) {
      //   if (error.message === 'Rate limiter exceeded') {
      //     return res.status(429).json({ error: 'Too many attempts' });
      //   }
      // }
      res.status(500).json({ error: 'Verification failed' });
    }
  });