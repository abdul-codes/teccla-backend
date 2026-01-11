import rateLimit from "express-rate-limit";

// Stricter rate limiting for authentication-related routes
 
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 authentication requests per window
    message: {
        message: 'Too many authentication attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting on localhost during development
        return (
            process.env.NODE_ENV === 'development' &&
            (req.ip === '::1' || req.ip === '127.0.0.1')
        );
    },
});
