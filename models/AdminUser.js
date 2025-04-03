const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const AdminUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'super-admin'],
    default: 'admin',
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: {
    type: Number,
    default: 0,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockUntil: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
AdminUserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
AdminUserSchema.pre('save', async function (next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
AdminUserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
AdminUserSchema.methods.generateOTP = function () {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set OTP expiry to 10 minutes from now
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  };

  return otp;
};

// Method to verify OTP
AdminUserSchema.methods.verifyOTP = function (candidateOTP) {
  return (
    this.otp &&
    this.otp.code === candidateOTP &&
    this.otp.expiresAt > new Date()
  );
};

// Method to generate password reset token
AdminUserSchema.methods.generatePasswordResetToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set token expiry to 30 minutes
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

  return resetToken;
};

// Method to check if account is locked
AdminUserSchema.methods.isAccountLocked = function () {
  return this.isLocked && this.lockUntil > Date.now();
};

// Method to increment login attempts
AdminUserSchema.methods.incrementLoginAttempts = async function () {
  // Increment login attempts
  this.loginAttempts += 1;

  // Lock account if login attempts exceed 5
  if (this.loginAttempts >= 5) {
    this.isLocked = true;
    this.lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }

  await this.save();
};

// Method to reset login attempts
AdminUserSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.isLocked = false;
  this.lockUntil = undefined;
  this.lastLogin = Date.now();

  await this.save();
};

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

module.exports = AdminUser;
