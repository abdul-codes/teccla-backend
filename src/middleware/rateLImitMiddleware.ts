import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting on localhost during development
    return (
      process.env.NODE_ENV === 'development' &&
      (req.ip === '::1' || req.ip === '127.0.0.1')
    );
  }
});

export default limiter;   