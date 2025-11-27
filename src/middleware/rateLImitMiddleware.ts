import rateLimit from "express-rate-limit";

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes (shorter window for development)
	max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again after 15 minutes',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	// Skip rate limiting in development 
	skip: (req) => {
		// Optionally skip rate limiting for localhost in development
		return process.env.NODE_ENV === 'development' && req.ip === '::1' || req.ip === '127.0.0.1';
	}
})

export default limiter