import { Request, Response } from "express";
import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken } from "../utils/generateJwt";
import { prisma } from "../utils/db";

export const registerUser = async (req: Request, res: Response) => {
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

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        role,
        salt,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(newUser.id, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error registering user', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Login Controller
export const loginUser = async (req: Request, res: Response) => {
  try {
    // Validate input
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({ errors: errors.array() });
    // }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        message: 'Account is not active' 
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
};

// Logout Controller
export const logoutUser = async (req: Request, res: Response) => {
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
};

// Token Refresh Controller
