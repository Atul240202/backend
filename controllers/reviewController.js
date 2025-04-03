const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Product = require('../models/Product');
const FinalOrder = require('../models/FinalOrder');
const mongoose = require('mongoose');

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    // Get all approved reviews for the product
    const reviews = await Review.find({
      productId: productId,
      status: 'approved',
    });

    // Calculate new average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating =
      reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '0.0';

    // Update product document
    await Product.findOneAndUpdate(
      { id: productId },
      {
        average_rating: averageRating,
        rating_count: reviews.length,
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating product rating:', error);
    return { success: false, error };
  }
};

// @desc    Check if user has purchased the product
// @route   GET /api/products/:id/purchase-verification
// @access  Private
const verifyPurchase = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const userId = req.user._id;

  // Find orders containing this product for this user
  const orders = await FinalOrder.find({
    userId: userId,
    'products.id': productId,
    status: { $in: ['delivered', 'completed'] }, // Only count completed orders
  });

  const hasPurchased = orders.length > 0;

  res.json({
    verified: hasPurchased,
  });
});

// @desc    Get reviews for a product with pagination
// @route   GET /api/products/:id/reviews
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get total count of approved reviews
  const totalReviews = await Review.countDocuments({
    productId: productId,
    status: 'approved',
  });

  // Get paginated reviews
  const reviews = await Review.find({
    productId: productId,
    status: 'approved',
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'fullName')
    .lean();

  // Format reviews for frontend
  const formattedReviews = reviews.map((review) => ({
    id: review._id,
    userId: review.userId._id,
    userName: review.userInfo?.name || review.userId.fullName,
    rating: review.rating,
    comment: review.comment,
    date: review.createdAt,
    purchaseVerified: review.purchaseVerified,
  }));

  res.json({
    reviews: formattedReviews,
    page,
    pages: Math.ceil(totalReviews / limit),
    total: totalReviews,
  });
});

// @desc    Add a new review
// @route   POST /api/products/:id/reviews
// @access  Private
const addProductReview = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const userId = req.user._id;
  const { rating, comment } = req.body;

  // Validate input
  if (!rating || !comment) {
    res.status(400);
    throw new Error('Please provide both rating and comment');
  }

  // Check if product exists
  const product = await Product.findOne({ id: productId });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({ productId, userId });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  // Check if user has purchased the product
  const orders = await FinalOrder.find({
    userId: userId,
    'products.id': productId,
    status: { $in: ['delivered', 'completed'] },
  });

  const purchaseVerified = orders.length > 0;

  // Create the review
  const review = new Review({
    productId,
    userId,
    rating: Number(rating),
    comment,
    purchaseVerified,
    userInfo: {
      name: req.user.fullName,
    },
  });

  await review.save();

  // Update product rating
  await updateProductRating(productId);

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    review: {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt,
      userName: req.user.fullName,
      purchaseVerified,
    },
  });
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const { rating, comment } = req.body;

  // Find the review
  const review = await Review.findById(reviewId);

  // Check if review exists
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check if user owns the review
  if (review.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this review');
  }

  // Update the review
  review.rating = Number(rating) || review.rating;
  review.comment = comment || review.comment;

  await review.save();

  // Update product rating
  await updateProductRating(review.productId);

  res.json({
    success: true,
    message: 'Review updated successfully',
    review: {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      date: review.updatedAt,
      userName: req.user.fullName,
    },
  });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;

  // Find the review
  const review = await Review.findById(reviewId);

  // Check if review exists
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check if user owns the review or is admin
  if (
    review.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to delete this review');
  }

  const productId = review.productId;

  // Delete the review
  await Review.deleteOne({ _id: reviewId });

  // Update product rating
  await updateProductRating(productId);

  res.json({
    success: true,
    message: 'Review deleted successfully',
  });
});

// @desc    Get all reviews for a user
// @route   GET /api/users/reviews
// @access  Private
const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get total count
  const totalReviews = await Review.countDocuments({ userId });

  // Get paginated reviews
  const reviews = await Review.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Get product details for each review
  const reviewsWithProducts = await Promise.all(
    reviews.map(async (review) => {
      const product = await Product.findOne({ id: review.productId })
        .select('id name images')
        .lean();

      return {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        date: review.createdAt,
        status: review.status,
        product: product
          ? {
              id: product.id,
              name: product.name,
              image:
                product.images && product.images.length > 0
                  ? product.images[0].src
                  : null,
            }
          : null,
      };
    })
  );

  res.json({
    reviews: reviewsWithProducts,
    page,
    pages: Math.ceil(totalReviews / limit),
    total: totalReviews,
  });
});

// ADMIN CONTROLLERS

// @desc    Get all reviews (admin)
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getAllReviews = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status || 'all';

  // Build filter
  const filter = status !== 'all' ? { status } : {};

  // Get total count
  const totalReviews = await Review.countDocuments(filter);

  // Get paginated reviews
  const reviews = await Review.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'fullName email')
    .lean();

  // Get product details for each review
  const reviewsWithDetails = await Promise.all(
    reviews.map(async (review) => {
      const product = await Product.findOne({ id: review.productId })
        .select('id name images')
        .lean();

      return {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        date: review.createdAt,
        status: review.status,
        user: {
          id: review.userId._id,
          name: review.userId.fullName,
          email: review.userId.email,
        },
        product: product
          ? {
              id: product.id,
              name: product.name,
              image:
                product.images && product.images.length > 0
                  ? product.images[0].src
                  : null,
            }
          : { id: review.productId, name: 'Product not found', image: null },
      };
    })
  );

  res.json({
    reviews: reviewsWithDetails,
    page,
    pages: Math.ceil(totalReviews / limit),
    total: totalReviews,
  });
});

// @desc    Update review status (admin)
// @route   PUT /api/admin/reviews/:id
// @access  Private/Admin
const updateReviewStatus = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const { status } = req.body;

  // Validate status
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  // Find the review
  const review = await Review.findById(reviewId);

  // Check if review exists
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Update status
  review.status = status;
  await review.save();

  // If status changed to/from approved, update product rating
  if (status === 'approved' || review.status === 'approved') {
    await updateProductRating(review.productId);
  }

  res.json({
    success: true,
    message: `Review status updated to ${status}`,
  });
});

module.exports = {
  getProductReviews,
  addProductReview,
  updateReview,
  deleteReview,
  getUserReviews,
  getAllReviews,
  updateReviewStatus,
  verifyPurchase,
};
