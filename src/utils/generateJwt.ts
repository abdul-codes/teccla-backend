import jwt from 'jsonwebtoken';



// JWT Configuration
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

if (!ACCESS_TOKEN || !REFRESH_TOKEN) {
  throw new Error('JWT secrets not configured in environment variables');
}

// Generate Access Token (1 hour expiry for better UX)
export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, ACCESS_TOKEN, {
    expiresIn: '1h'
  });
};

// Generate Refresh Token (30 days expiry)
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, REFRESH_TOKEN, {
    expiresIn: '30d'
  });
};