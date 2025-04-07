const express = require('express');
const router = express.Router();
const {
  createUnprocessedOrder,
  getUserUnprocessedOrders,
  getAllUnprocessedOrders,
  getUnprocessedOrderById,
  updateUnprocessedOrder,
  deleteUnprocessedOrder,
  deleteUserUnprocessedOrders,
} = require('../controllers/unprocessedOrderController');
const {
  protect,
  admin,
  protectAdmin,
} = require('../middleware/authMiddleware');

// Routes for unprocessed orders
router
  .route('/')
  .post(protect, createUnprocessedOrder)
  .get(protect, getUserUnprocessedOrders);

router.route('/all').get(protectAdmin, getAllUnprocessedOrders);

router.route('/user').delete(protect, deleteUserUnprocessedOrders);

router
  .route('/:id')
  .get(protect, getUnprocessedOrderById)
  .put(protectAdmin, updateUnprocessedOrder)
  .delete(protect, deleteUnprocessedOrder);

module.exports = router;
