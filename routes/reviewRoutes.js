const express = require("express");
const router = express.Router();
const {
  getProductReviews,
  addProductReview,
  updateReview,
  deleteReview,
  getUserReviews,
  getAllReviews,
  updateReviewStatus,
  verifyPurchase,
  getReviewsByProductId,
} = require("../controllers/reviewController");
const {
  protect,
  protectAdmin,
  isAdmin,
} = require("../middleware/authMiddleware");

// Public routes
router.get("/products/:id/reviews", getProductReviews);

// Protected routes
router.get("/products/:id/purchase-verification", protect, verifyPurchase);
router.post("/products/:id/reviews", protect, addProductReview);
router.put("/reviews/:id", protect, updateReview);
router.delete("/reviews/:id", protect, deleteReview);
router.get("/users/reviews", protect, getUserReviews);

// Admin routes
router.get("/admin/reviews", protect, isAdmin, getAllReviews);
router.put("/admin/reviews/:id", protectAdmin, isAdmin, updateReviewStatus);
router.get(
  "/admin/reviews/order/:orderId",
  protectAdmin,
  isAdmin,
  getReviewsByProductId
);

module.exports = router;
