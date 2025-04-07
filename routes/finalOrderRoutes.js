const express = require('express');
const router = express.Router();
const {
  protect,
  admin,
  protectAdmin,
} = require('../middleware/authMiddleware');
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
router.get('/all', protectAdmin, getAllFinalOrders);

// Get current user's final orders
router.get('/my-orders', protect, getMyFinalOrders);

// Get a specific final order by ID
router.get('/:id', protect, getFinalOrderById);

// Update a final order status (admin only)
router.put('/:id/status', protectAdmin, updateFinalOrderStatus);

// Delete a final order (admin only)
router.delete('/:id', protectAdmin, deleteFinalOrder);

// Retry ShipRocket integration for a failed order (admin only)
router.post('/:id/retry-shiprocket', protectAdmin, retryShipRocketIntegration);

// Track shipment
router.get('/:id/track', protect, trackShipment);

module.exports = router;
