import jwt from 'jsonwebtoken';
import crypto from 'crypto';


// JWT Configuration
const ACCESS_TOKEN = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_TOKEN || !REFRESH_TOKEN) {
  throw new Error('JWT secrets not configured. Required: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET');
}

// Generate Access Token (1 hour expiry for better UX)
export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, ACCESS_TOKEN, {
    expiresIn: '1h'
  });
};

// Generate Refresh Token (30 days expiry)
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ 
    id: userId, 
    jti: crypto.randomUUID()
  }, REFRESH_TOKEN, {
    expiresIn: '30d'
  });
};

// Generate Refresh Token (30 days expiry)
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, REFRESH_TOKEN, {
    expiresIn: '30d'
  });
};