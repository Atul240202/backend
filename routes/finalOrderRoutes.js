const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createFinalOrder,
  getAllFinalOrders,
  getMyFinalOrders,
  getFinalOrderById,
  updateFinalOrderStatus,
  deleteFinalOrder,
  retryShipRocketIntegration,
  trackShipment,
} = require('../controllers/finalOrderController');

// Create a new final order
router.post('/', protect, createFinalOrder);

// Get all final orders (admin only)
router.get('/all', protect, admin, getAllFinalOrders);

// Get current user's final orders
router.get('/my-orders', protect, getMyFinalOrders);

// Get a specific final order by ID
router.get('/:id', protect, getFinalOrderById);

// Update a final order status (admin only)
router.put('/:id/status', protect, admin, updateFinalOrderStatus);

// Delete a final order (admin only)
router.delete('/:id', protect, admin, deleteFinalOrder);

// Retry ShipRocket integration for a failed order (admin only)
router.post(
  '/:id/retry-shiprocket',
  protect,
  admin,
  retryShipRocketIntegration
);

// Track shipment
router.get('/:id/track', protect, trackShipment);

module.exports = router;
