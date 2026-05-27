const rateLimitStore = {};

/**
 * Custom Rate Limiter Middleware (In-memory)
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 1 minute)
 * @param {number} options.max - Maximum number of requests allowed per windowMs (default: 60)
 * @param {string} options.message - Error message to return when limit exceeded
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 60 * 1000, // Default 1 minute
        max = 60,            // Default 60 requests
        message = 'Too many requests from this IP, please try again later.'
    } = options;

    return (req, res, next) => {
        // Bypass rate limits for automated tests
        if (req.headers['x-testing'] === 'true' || process.env.NODE_ENV === 'test') {
            return next();
        }

        // Simple IP identifier
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const route = req.originalUrl || req.url;
        const key = `${ip}:${route}`; // Track limit per IP and route path
        
        const now = Date.now();

        if (!rateLimitStore[key]) {
            rateLimitStore[key] = [];
        }

        // Clean up older timestamps outside the current window
        rateLimitStore[key] = rateLimitStore[key].filter(timestamp => now - timestamp < windowMs);

        if (rateLimitStore[key].length >= max) {
            return res.status(429).json({
                success: false,
                message,
                limit: max,
                remaining: 0,
                resetTime: new Date(now + windowMs).toISOString()
            });
        }

        rateLimitStore[key].push(now);
        
        // Add standard rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', max - rateLimitStore[key].length);
        
        next();
    };
};

module.exports = createRateLimiter;
