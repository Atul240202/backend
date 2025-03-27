const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlistItem,
} = require('../controllers/wishlistController');

// Protect all wishlist routes
router.use(protect);

// Add to wishlist and get wishlist
router.route('/').post(addToWishlist).get(getWishlist).delete(clearWishlist);

// Check if product is in wishlist
router.route('/check/:productId').get(checkWishlistItem);

// Remove from wishlist
router.route('/:productId').delete(removeFromWishlist);

module.exports = router;
