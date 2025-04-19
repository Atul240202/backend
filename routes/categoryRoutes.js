const express = require("express");
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const {
  protect,
  protectAdmin,
  isAdmin,
} = require("../middleware/authMiddleware");

// Get all categories
router
  .route("/")
  .get(getCategories)
  .post(protectAdmin, isAdmin, createCategory);

// Get category by ID
router
  .route("/:id")
  .get(getCategoryById)
  .put(protectAdmin, isAdmin, updateCategory)
  .delete(protectAdmin, isAdmin, deleteCategory);

module.exports = router;
