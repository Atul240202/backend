const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const PreRegistration = require('../models/PreRegistration');
const sendEmail = require('../utils/sendEmail');
const PasswordReset = require('../models/PasswordReset');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User already exists with this email' });
    }

    // Check if phone is already in use
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res
        .status(400)
        .json({ message: 'User already exists with this phone number' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Generated hash during registration:', hashedPassword);

    // Create pre-registration record
    const preRegistration = new PreRegistration({
      fullName,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpiry,
    });

    await preRegistration.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: preRegistration._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send OTP email
    const message = `
      <h1>Email Verification</h1>
      <p>Thank you for registering with Industrywaala. Please use the following OTP to verify your account:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    await sendEmail({
      email,
      subject: 'Industrywaala - Email Verification OTP',
      message,
    });

    res.status(201).json({
      success: true,
      message:
        'Registration initiated. Please verify your email with the OTP sent.',
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    // Get user ID from token
    const decoded = jwt.verify(
      req.headers.authorization.split(' ')[1],
      process.env.JWT_SECRET
    );

    // Find pre-registration record
    const preRegistration = await PreRegistration.findById(decoded.id);

    if (!preRegistration) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired registration session' });
    }

    // Check if OTP is expired
    if (preRegistration.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Verify OTP
    if (preRegistration.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Create new user
    const newUser = new User({
      fullName: preRegistration.fullName,
      email: preRegistration.email,
      phone: preRegistration.phone,
      password: preRegistration.password,
      isVerified: true,
    });
    newUser.$skipValidation = true;
    await newUser.save();

    // Delete pre-registration record
    await PreRegistration.findByIdAndDelete(preRegistration._id);

    res.status(200).json({
      success: true,
      message: 'Account verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Get user ID from token
    const decoded = jwt.verify(
      req.headers.authorization.split(' ')[1],
      process.env.JWT_SECRET
    );

    // Find pre-registration record
    const preRegistration = await PreRegistration.findById(decoded.id);

    if (!preRegistration) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired registration session' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update pre-registration record
    preRegistration.otp = otp;
    preRegistration.otpExpiry = otpExpiry;
    await preRegistration.save();

    // Send OTP email
    const message = `
      <h1>Email Verification</h1>
      <p>Thank you for registering with Industrywaala. Please use the following OTP to verify your account:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    await sendEmail({
      email: preRegistration.email,
      subject: 'Industrywaala - Email Verification OTP',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    console.log(`User  found : ${user} : ${password}`);
    if (!user) {
      console.log(`User not found with email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      console.log(`User found but not verified: ${email}`);
      return res
        .status(401)
        .json({ message: 'Please verify your email before logging in' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log(`Password match result: ${isMatch}`);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({
      email: { $regex: new RegExp('^' + email + '$', 'i') },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found with this email' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if there's an existing password reset record
    let passwordReset = await PasswordReset.findOne({ email });

    if (passwordReset) {
      // Update existing record
      passwordReset.otp = otp;
      passwordReset.otpExpiry = otpExpiry;
      await passwordReset.save();
    } else {
      // Create new password reset record
      passwordReset = new PasswordReset({
        email,
        otp,
        otpExpiry,
      });
      await passwordReset.save();
    }

    // Generate JWT token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Send OTP email
    const message = `
      <h1>Password Reset</h1>
      <p>You requested to reset your password. Please use the following OTP to verify your identity:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this password reset, please ignore this email.</p>
    `;

    await sendEmail({
      email,
      subject: 'Industrywaala - Password Reset OTP',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email',
      token,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify Reset OTP
exports.verifyResetOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    // Get email from token
    const decoded = jwt.verify(
      req.headers.authorization.split(' ')[1],
      process.env.JWT_SECRET
    );
    const email = decoded.email;

    // Find password reset record
    const passwordReset = await PasswordReset.findOne({ email });

    if (!passwordReset) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired password reset session' });
    }

    // Check if OTP is expired
    if (passwordReset.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Verify OTP
    if (passwordReset.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Generate a new token for password reset
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      token: resetToken,
    });
  } catch (error) {
    console.error('Reset OTP verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Resend Reset OTP
exports.resendResetOTP = async (req, res) => {
  try {
    // Get email from token
    const decoded = jwt.verify(
      req.headers.authorization.split(' ')[1],
      process.env.JWT_SECRET
    );
    const email = decoded.email;

    // Find password reset record
    const passwordReset = await PasswordReset.findOne({ email });

    if (!passwordReset) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired password reset session' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update password reset record
    passwordReset.otp = otp;
    passwordReset.otpExpiry = otpExpiry;
    await passwordReset.save();

    // Send OTP email
    const message = `
      <h1>Password Reset</h1>
      <p>You requested to reset your password. Please use the following OTP to verify your identity:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this password reset, please ignore this email.</p>
    `;

    await sendEmail({
      email,
      subject: 'Industrywaala - Password Reset OTP',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset OTP resent successfully',
    });
  } catch (error) {
    console.error('Resend reset OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    // Get email from token
    const decoded = jwt.verify(
      req.headers.authorization.split(' ')[1],
      process.env.JWT_SECRET
    );
    const email = decoded.email;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    // Delete password reset record
    await PasswordReset.findOneAndDelete({ email });

    res.status(200).json({
      success: true,
      message:
        'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
