const express = require("express");
const router = express.Router();
const {
  protect,
  admin,
  protectAdmin,
  isAdmin,
} = require("../middleware/authMiddleware");
const shipRocketController = require("../controllers/shipRocketController");

// Admin route to manually refresh token
router.post(
  "/refresh-token",
  protect,
  admin,
  shipRocketController.refreshToken
);

// router.post("/cancel-shipment", protectAdmin, isAdmin, async (req, res) => {
//   try {
//     const { awbs } = req.body;
//     const result = await shipRocketController.cancelShipments(awbs);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: "Cancellation failed",
//       error: err.message,
//     });
//   }
// });

// router.post("/user/cancel-shipment", protect, async (req, res) => {
//   try {
//     const { awbs } = req.body;
//     const result = await shipRocketController.cancelShipments(awbs);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: "User cancellation failed",
//       error: err.message,
//     });
//   }
// });

// router.post("/cancel-by-order-id", protectAdmin, isAdmin, async (req, res) => {
//   try {
//     const { ids } = req.body;
//     const result = await shipRocketController.cancelOrderByOrderId(ids);
//     res.json(result);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: "Admin cancellation failed", error: err.message });
//   }
// });

// router.post("/user/cancel-by-order-id", protect, async (req, res) => {
//   try {
//     const { ids } = req.body;
//     const result = await shipRocketController.cancelOrderByOrderId(ids);
//     res.json(result);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: "User cancellation failed", error: err.message });
//   }
// });

router.post("/generate-manifest", protectAdmin, isAdmin, async (req, res) => {
  try {
    const { shipment_id } = req.body;
    const result = await shipRocketController.generateManifest(shipment_id);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Manifest generation failed", error: err.message });
  }
});

router.post("/print-manifest", protectAdmin, isAdmin, async (req, res) => {
  try {
    const { order_ids } = req.body;
    const result = await shipRocketController.printManifest(order_ids);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Manifest print failed", error: err.message });
  }
});

router.post("/generate-label", protectAdmin, isAdmin, async (req, res) => {
  try {
    const { shipment_id } = req.body;
    const result = await shipRocketController.generateLabel(shipment_id);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Label generation failed", error: err.message });
  }
});

router.post("/generate-invoice", protectAdmin, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await shipRocketController.generateTaxInvoice(ids);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Invoice generation failed", error: err.message });
  }
});

router.post("/user/generate-invoice", protect, async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await shipRocketController.generateTaxInvoice(ids);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Invoice generation failed", error: err.message });
  }
});

router.get("/order-details/:id", protectAdmin, isAdmin, async (req, res) => {
  try {
    const result = await shipRocketController.getShiprocketOrderDetails(
      req.params.id
    );
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch order", error: err.message });
  }
});

router.get("/user/order-details/:id", protect, async (req, res) => {
  try {
    const result = await shipRocketController.getShiprocketOrderDetails(
      req.params.id
    );
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch order", error: err.message });
  }
});

router.post("/create-return", protectAdmin, isAdmin, async (req, res) => {
  try {
    const result = await shipRocketController.createReturnOrder(req.body);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create return order", error: err.message });
  }
});

router.post("/user/create-return", protect, async (req, res) => {
  try {
    const result = await shipRocketController.createReturnOrder(req.body);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create return order", error: err.message });
  }
});

router.post(
  "/check-delivery",
  shipRocketController.checkDeliveryServiceability
);

// POST /api/shiprocket/update-order
router.post(
  "/update-order",
  protectAdmin,
  isAdmin,
  shipRocketController.updateShiprocketOrder
);

module.exports = router;

// Route to get ShipRocket order details
// router.get("/orders/:id", protect, shipRocketController.getShipRocketOrder);

module.exports = router;
