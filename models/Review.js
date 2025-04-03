const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    purchaseVerified: {
      type: Boolean,
      default: false,
    },
    userInfo: {
      name: String,
      avatar: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster queries of user reviews for a specific product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Index for status-based queries (for admin moderation)
reviewSchema.index({ status: 1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
