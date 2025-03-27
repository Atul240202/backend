const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');

// Protect all cart routes
router.use(protect);

// Add to cart and get cart
router.route('/').post(addToCart).get(getCart).delete(clearCart);

// Update and remove cart item
router.route('/:productId').put(updateCartItem).delete(removeFromCart);

module.exports = router;
