import rateLimit from "express-rate-limit";
import { NextFunction, Request, Response } from "express";
import { asyncMiddleware } from "./asyncMiddleware";

// Per-user message rate limiting
const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 30 messages per minute per user
  message: 'Too many messages. Please wait before sending more.',
  keyGenerator: (req: Request) => `message:${req.user?.id || 'anonymous'}`,
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-conversation rate limiting
const conversationMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 10 messages per minute per conversation
  message: 'Too many messages in this conversation. Please slow down.',
  keyGenerator: (req: Request) => {
    const conversationId = req.body.conversationId || req.params.conversationId;
    return `conv:${conversationId}:${req.user?.id || 'anonymous'}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cooldown between messages (3 seconds)
const messageCooldown = new Map<string, number>();

export const messageRateLimitMiddleware = asyncMiddleware(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return next();
  }

  // Check cooldown
  const lastMessageTime = messageCooldown.get(userId);
  const now = Date.now();
  
  if (lastMessageTime && now - lastMessageTime < 3000) {
    return res.status(429).json({ 
      message: 'Please wait 3 seconds before sending another message' 
    });
  }

  // Update cooldown
  messageCooldown.set(userId, now);
  
  // Clean up old entries (older than 5 minutes)
  setTimeout(() => {
    messageCooldown.delete(userId);
  }, 5 * 60 * 1000);

  next();
});

export { messageRateLimiter, conversationMessageLimiter };