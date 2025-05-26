const express = require("express");
const {
  getVariationsByParent,
  getVariationById,
  createVariation,
  updateVariation,
  deleteVariation,
  updateVariationByWooId,
  deleteVariationByWooId,
} = require("../controllers/productVariationController");
const { protectAdmin, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET all variations for a parent product
router.get("/parent/:parentId", getVariationsByParent);

// GET single variation by Mongo ID
router.get("/:id", getVariationById);

// POST new variation
router.post("/", protectAdmin, isAdmin, createVariation);

// PUT update variation by Mongo ID
router.put("/:id", protectAdmin, isAdmin, updateVariation);

// DELETE variation by Mongo ID
router.delete("/:id", protectAdmin, isAdmin, deleteVariation);

// Update/Delete by WooCommerce ID (variation.id)
router.put("/woo/:wooId", protectAdmin, isAdmin, updateVariationByWooId);
router.delete("/woo/:wooId", protectAdmin, isAdmin, deleteVariationByWooId);

module.exports = router;
