const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
  logout,
} = require('../controllers/adminAuthController');

// Import middleware
const { protectAdmin } = require('../middleware/authMiddleware');
const {
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
} = require('../middleware/rateLimiter');
const {
  validateRegistration,
  validateLogin,
  validateOTP,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
} = require('../middleware/validationMiddleware');

// Routes
router.post('/register', validateRegistration, register);
router.post('/verify-otp', validateOTP, otpLimiter, verifyOTP);
router.post('/resend-otp', validateForgotPassword, otpLimiter, resendOTP);
router.post('/login', validateLogin, loginLimiter, login);
router.post(
  '/forgot-password',
  validateForgotPassword,
  passwordResetLimiter,
  forgotPassword
);
router.post('/reset-password/:token', validateResetPassword, resetPassword);
router.post(
  '/change-password',
  protectAdmin,
  validateChangePassword,
  changePassword
);
router.get('/me', protectAdmin, getCurrentUser);
router.post('/logout', logout);

module.exports = router;
