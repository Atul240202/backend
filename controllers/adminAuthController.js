const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const {
  sendOTPEmail,
  sendPasswordResetEmail,
} = require('../utils/emailService');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

// Register admin user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await AdminUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Create new admin user
    const user = await AdminUser.create({
      name,
      email,
      password,
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, name, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    res.status(201).json({
      success: true,
      message:
        'Registration successful. Please verify your email with the OTP sent to your email address.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user by email
    const user = await AdminUser.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if OTP is valid
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    // Send token in cookie
    res.cookie('adminToken', token, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during OTP verification',
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await AdminUser.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, user.name, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resending OTP',
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await AdminUser.findOne({ email }).select('+password');

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(401).json({
        success: false,
        message:
          'Account is locked due to too many failed login attempts. Please try again later.',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      await user.incrementLoginAttempts();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Email not verified. Please verify your email first.',
      });
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Generate token
    const token = generateToken(user._id);

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    // Send token in cookie
    res.cookie('adminToken', token, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await AdminUser.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      email,
      user.name,
      resetToken
    );

    if (!emailSent) {
      // If email fails to send, clear the reset token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by reset token and check if token is expired
    const user = await AdminUser.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // Check if user exists and token is valid
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message:
        'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting your password',
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user from database with password
    const user = await AdminUser.findById(req.user._id).select('+password');

    // Check if current password matches
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing your password',
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    // Check if req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }
    const user = await AdminUser.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data',
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // Clear the cookie
    res.cookie('adminToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout',
    });
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
  logout,
};
