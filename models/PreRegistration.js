const mongoose = require('mongoose');

const preRegistrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpiry: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '1h', // Automatically delete documents after 1 hour
  },
});

const PreRegistration = mongoose.model(
  'PreRegistration',
  preRegistrationSchema
);

module.exports = PreRegistration;
