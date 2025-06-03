import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// Create different limiters for different endpoints
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        type: 'RATE-LIMIT-ERROR',
        code: '42901',
        message
      }
    },
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        limit: max,
        windowMs
      });
      res.status(429).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Global limiter for all routes
export const globalLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later'
);

// Stricter limiter for authentication endpoints
export const authLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 requests per hour
  'Too many authentication attempts, please try again later'
);

// API specific limiter
export const apiLimiter = createLimiter(
  60 * 1000, // 1 minute
  30, // 30 requests per minute
  'Too many API requests, please try again later'
); 