const rateLimit = require('express-rate-limit');

// Login rate limiter - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP rate limiter - 3 attempts per 30 minutes
const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // 3 requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 30 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter - 3 attempts per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per windowMs
  message: {
    success: false,
    message:
      'Too many password reset requests. Please try again after an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
};
