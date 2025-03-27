const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  verifyResetOTP,
  resendResetOTP,
  resetPassword,
} = require('../controllers/authController');

// Register a new user
router.post('/register', register);

// Verify OTP
router.post('/verify', verifyOTP);

// Resend OTP
router.post('/resend-otp', resendOTP);

// Login user
router.post('/login', login);

// Forgot password
router.post('/forgot-password', forgotPassword);

// Verify reset OTP
router.post('/verify-reset-otp', verifyResetOTP);

// Resend reset OTP
router.post('/resend-reset-otp', resendResetOTP);

// Reset password
router.post('/reset-password', resetPassword);
module.exports = router;
