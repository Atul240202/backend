const ProductVariation = require("../models/ProductVariation");

// ✅ GET all variations for a parent product
exports.getVariationsByParent = async (req, res) => {
  try {
    const variations = await ProductVariation.find({
      parent_id: parseInt(req.params.parentId),
    });

    res.json(variations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch variations" });
  }
};

// ✅ GET a single variation
exports.getVariationById = async (req, res) => {
  try {
    const variation = await ProductVariation.findById(req.params.id);
    if (!variation) {
      return res.status(404).json({ error: "Variation not found" });
    }
    res.json(variation);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch variation" });
  }
};

// ✅ CREATE a new variation
exports.createVariation = async (req, res) => {
  try {
    const newVariation = await ProductVariation.create(req.body);
    res.status(201).json(newVariation);
  } catch (err) {
    res
      .status(400)
      .json({ error: "Failed to create variation", details: err.message });
  }
};

// ✅ UPDATE variation by Mongo ID
exports.updateVariation = async (req, res) => {
  try {
    const updated = await ProductVariation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Variation not found" });
    }

    res.json(updated);
  } catch (err) {
    res
      .status(400)
      .json({ error: "Failed to update variation", details: err.message });
  }
};

// ✅ DELETE variation by Mongo ID
exports.deleteVariation = async (req, res) => {
  try {
    const deleted = await ProductVariation.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Variation not found" });
    }

    res.json({ message: "Variation deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete variation" });
  }
};

// 🔁 UPDATE by WooCommerce variation.id
exports.updateVariationByWooId = async (req, res) => {
  try {
    const updated = await ProductVariation.findOneAndUpdate(
      { id: parseInt(req.params.wooId) },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Variation not found" });
    }

    res.json(updated);
  } catch (err) {
    res
      .status(400)
      .json({ error: "Failed to update variation", details: err.message });
  }
};

// 🗑️ DELETE by WooCommerce variation.id
exports.deleteVariationByWooId = async (req, res) => {
  try {
    const deleted = await ProductVariation.findOneAndDelete({
      id: parseInt(req.params.wooId),
    });

    if (!deleted) {
      return res.status(404).json({ error: "Variation not found" });
    }

    res.json({ message: "Variation deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete variation" });
  }
};
