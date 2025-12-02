import rateLimit from "express-rate-limit";

// Simple unified rate limiter for chat
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});