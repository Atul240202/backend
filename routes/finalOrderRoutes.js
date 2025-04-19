const express = require("express");
const router = express.Router();
const {
  protect,
  admin,
  isAdmin,
  protectAdmin,
} = require("../middleware/authMiddleware");
const {
  createFinalOrder,
  getAllFinalOrders,
  getMyFinalOrders,
  getFinalOrderById,
  updateFinalOrderStatus,
  deleteFinalOrder,
  retryShipRocketIntegration,
  trackShipment,
  assignCourierToOrder,
  getInvoiceByOrderId,
  cancelFinalOrderWithRefund,
  getUserOrderStats,
  getBatchUserOrderStats,
  getAllPayments,
} = require("../controllers/finalOrderController");

// Create a new final order
router.post("/", protect, createFinalOrder);

// Get all final orders (admin only)
router.get("/all", protectAdmin, getAllFinalOrders);

// Get current user's final orders
router.get("/my-orders", protect, getMyFinalOrders);

// Get a specific final order by ID
router.get("/:id", protect, getFinalOrderById);

// Update a final order status (admin only)
router.put("/:id/status", protectAdmin, updateFinalOrderStatus);

//Fetch all the payment data for admin
router.get("/payments/all", protectAdmin, isAdmin, getAllPayments);

// Delete a final order (admin only)
router.delete("/:id", protectAdmin, deleteFinalOrder);

// Retry ShipRocket integration for a failed order (admin only)
router.post("/:id/retry-shiprocket", protectAdmin, retryShipRocketIntegration);

// Track shipment
router.get("/:id/track", protect, trackShipment);
router.put("/:id/assign-courier", protectAdmin, isAdmin, assignCourierToOrder);

//Fetch order invoice
router.get("/user/invoice/:order_id", protect, getInvoiceByOrderId);
router.get("/invoice/:order_id", protectAdmin, isAdmin, getInvoiceByOrderId);

router.post(
  "/cancel-shipment",
  protectAdmin,
  isAdmin,
  cancelFinalOrderWithRefund
);

router.get(
  "/admin/user-orders/:userId",
  protectAdmin,
  isAdmin,
  getUserOrderStats
);

router.post(
  "/admin/batch-user-orders",
  protectAdmin,
  isAdmin,
  getBatchUserOrderStats
);

router.post("/user/cancel-shipment", protect, cancelFinalOrderWithRefund);
module.exports = router;
