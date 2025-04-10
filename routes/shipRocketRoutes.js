const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const shipRocketController = require("../controllers/shipRocketController");

// Admin route to manually refresh token
router.post(
  "/refresh-token",
  protect,
  admin,
  shipRocketController.refreshToken
);

// Route to get ShipRocket order details
router.get("/orders/:id", protect, shipRocketController.getShipRocketOrder);

module.exports = router;
