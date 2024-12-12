import jwt from 'jsonwebtoken';



// JWT Configuration
const ACCESS_TOKEN = process.env.ACCESS_TOKEN  as string;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN  as string;

// Generate Access Token
export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, ACCESS_TOKEN, {
    expiresIn: '15m'
  });
};

// Generate Refresh Token
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, REFRESH_TOKEN, {
    expiresIn: '7d'
  });
};