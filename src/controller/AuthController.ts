import { Request, Response } from "express";
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import { prisma } from "../utils/db";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { generateUniqueAccountId } from "../utils/generateAccountId";
import { generateOtp } from "../utils/generateOtp";
import { sendOTP } from "../utils/Mail";


export const registerUser = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    // Validate input
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phoneNumber,
      role = 'USER' 
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { 
        email: email 
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userAccountId = await  generateUniqueAccountId()

    const newUser = await prisma.user.create({

      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        role,
        userAccountId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    // Verify email
    const otp = generateOtp()
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpVerification.create({
      data: {otp, expires, userId: newUser.id}
    })

    await sendOTP(email, otp)
  
    res.status(201).json({ message: 'OTP sent to email' });


    // Generate tokens
   // const accessToken = generateAccessToken(newUser.id, newUser.role);
   // const refreshToken = generateRefreshToken(newUser.id);

    // res.status(201).json({
    //   message: 'User registered successfully',
    //   user: newUser,

    // });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error registering user', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
})

export const verifyOtp = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const {email,token} =  req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: { OtpVerification: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Already verified' });

    const otpVerificationToken = await prisma.otpVerification.findUnique({
      where:{ otp: token as string},
      include: {User: true}
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


  }catch (error) {
    // if (error instanceof Error) {
    //   if (error.message === 'Rate limiter exceeded') {
    //     return res.status(429).json({ error: 'Too many attempts' });
    //   }
    // }
    res.status(500).json({ error: 'Verification failed' });
  }
});

export const resendOtp = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    const {email} =  req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: { OtpVerification: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.emailVerified) return res.status(400).json({ error: 'Already verified' });

    await prisma.otpVerification.deleteMany({
      where: { userId: user.id },
    });

  // Verify email
  const otp = generateOtp()
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpVerification.create({
    data: {otp, expires, userId: user.id}
  })

  await sendOTP(email, otp)

  res.status(201).json({ message: 'New OTP sent to email' });

  } catch {
    res.status(500).json({ error: 'Failed to resend OTP' });

  }
  })
// Login Controller
export const loginUser = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    // Validate input
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const { accountId, password } = req.body;

    const isEmail =  accountId.includes('@')

    // Find user
    const user = await prisma.user.findUnique({
      where: isEmail? { email: accountId } : {userAccountId: accountId}
    }, );

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }


    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: { increment: 1 } }
      });

      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Reset login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        loginAttempts: 0,
        lastLogin: new Date()
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error logging in', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
})

// Logout Controller
export const logoutUser = asyncMiddleware(async (req: Request, res: Response) => {
  try {
    // If using refresh tokens, you might want to invalidate the token here
    // This would typically involve storing invalidated tokens in a blacklist or database

    res.json({ 
      message: 'Logout successful' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Error logging out', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});



// Token Refresh Controller
