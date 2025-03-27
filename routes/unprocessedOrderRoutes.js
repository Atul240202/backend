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
const { protect, admin } = require('../middleware/authMiddleware');

// Routes for unprocessed orders
router
  .route('/')
  .post(protect, createUnprocessedOrder)
  .get(protect, getUserUnprocessedOrders);

router.route('/all').get(protect, admin, getAllUnprocessedOrders);

router.route('/user').delete(protect, deleteUserUnprocessedOrders);

router
  .route('/:id')
  .get(protect, getUnprocessedOrderById)
  .put(protect, admin, updateUnprocessedOrder)
  .delete(protect, deleteUnprocessedOrder);

module.exports = router;
