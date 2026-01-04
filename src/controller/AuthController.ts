import { Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateJwt";
import { prisma } from "../utils/db";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { generateUniqueAccountId } from "../utils/generateAccountId";
import { generateOtp } from "../utils/generateOtp";
import { sendOTP } from "../utils/Mail";
import { UserRole } from "../../prisma/generated/prisma/client";
import Logger from "../utils/logger";

const REFRESH_TOKEN = process.env.REFRESH_TOKEN as string;

interface RegisterUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export const registerUser = asyncMiddleware(
  async (req: Request, res: Response) => {
    Logger.info("Registration request body:", req.body);

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      Logger.info("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      role = "USER",
    } = req.body as RegisterUserBody;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userAccountId = await generateUniqueAccountId();

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        userAccountId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Verify email
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpVerification.create({
      data: { otp, expires, userId: newUser.id },
    });

    try {
      const userName = `${newUser.firstName} ${newUser.lastName}`;
      await sendOTP(email, otp, userName);
      res.status(201).json({
        message: "Registration successful. Please check your email for OTP verification.",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        }
      });
    } catch (emailError) {
      Logger.error("Email sending failed:", emailError);
      // For development or when email is not configured, allow registration to proceed
      if (
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS ||
        process.env.NODE_ENV !== "production"
      ) {
        Logger.info("OTP for testing:", { otp });
        res
          .status(201)
          .json({
            message: "Registration successful. Check console for OTP (development mode)",
            otp: otp, // Expose OTP for testing
            user: {
              id: newUser.id,
              email: newUser.email,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
            }
          });
      } else {
        res
          .status(500)
          .json({ message: "Failed to send verification email" });
      }
    }
  },
);


// Login Controller
export const loginUser = asyncMiddleware(
  async (req: Request, res: Response) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountId, password } = req.body;

    const isEmail = accountId.includes("@");

    // Find user
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: accountId } : { userAccountId: accountId },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Check if user is currently locked out
    if (user.lockoutUntil && new Date() < user.lockoutUntil) {
      const remainingMinutes = Math.ceil(
        (user.lockoutUntil.getTime() - Date.now()) / 60000
      );
      return res.status(429).json({
        message: `Account locked. Please try again in ${remainingMinutes} minutes`,
        remainingMinutes,
        lockoutUntil: user.lockoutUntil,
      });
    }

    // Auto-unlock if lockout time has expired
    if (user.lockoutUntil && new Date() >= user.lockoutUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockoutUntil: null },
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment login attempts
      const newAttempts = user.loginAttempts + 1;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Locks account
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: newAttempts,
            lockoutUntil: new Date(Date.now() + LOCK_TIME_MS),
            lastLogin: new Date(),
          },
        });

        return res.status(429).json({
          message: `Account locked due to too many failed attempts. Please try again in 15 minutes`,
          lockoutMinutes: 15,
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts, lastLogin: new Date() },
      });

      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.emailVerified) {
      // Verify email
      return res.status(403).json({ message: "Email Verification required" });
    }

    // Reset login attempts and clear lockout
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockoutUntil: null,
        lastLogin: new Date(),
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Create refresh token record in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
      },
    });

    // Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict", // Prevent CSRF
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (match refresh token expiry)
    });

    // Send response with user details and access token
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken, // Send only access token in the body
    });
  },
);


// Logout Controller
export const logoutUser = asyncMiddleware(
  async (req: Request, res: Response) => {
    // Get the refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    // If refresh token exists, add it to the blacklist
    if (refreshToken) {
      try {
        // Verify the refresh token to get user ID
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN as string) as {
          id: string;
        };

        // Add the refresh token to the blacklist
        await prisma.refreshToken.updateMany({
          where: {
            token: refreshToken,
            userId: decoded.id,
          },
          data: { revoked: true }
        });
      } catch (verifyError) {
        Logger.error(
          "Error verifying refresh token for blacklisting:",
          verifyError,
        );
        // Continue with logout even if we can't blacklist the token
      }
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({
      message: "Logout successful",
    });
  },
);


// Token Refresh Controller
