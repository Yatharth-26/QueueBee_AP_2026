// Rate Limiting Middleware
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // e.g. 15 minutes
  max: env.RATE_LIMIT_MAX, // limit each IP to max requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || process.env.BENCHMARK === 'true',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 login/register attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || process.env.BENCHMARK === 'true',
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
