const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['shipping', 'billing'],
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  companyName: String,
  address1: {
    type: String,
    required: true,
  },
  address2: String,
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  postcode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
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
      required: function () {
        return !this.googleSignIn; // Password is required only if not using Google Sign-In
      },
    },
    username: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    addresses: [addressSchema],
    subscribeToNewsletter: {
      type: Boolean,
      default: false,
    },
    googleSignIn: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      sparse: true, // Allows null values but ensures uniqueness for non-null values
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// userSchema.pre('save', async function (next) {
//   // Skip hashing if this flag is set or if password hasn't changed
//   if (this.$skipValidation || !this.isModified('password')) {
//     return next();
//   }

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // Use bcrypt.compare which handles the salt extraction and comparison
    const result = await bcrypt.compare(candidatePassword, this.password);
    return result;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
