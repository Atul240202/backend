const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  getBestSellerProducts,
  getVariableProducts,
  getProductCategories,
  searchProductsByKeyword,
  searchBranchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getDraftProducts,
  getProductBySlug,
} = require("../controllers/productController");

const { protectAdmin, isAdmin } = require("../middleware/authMiddleware");

// Create a product & get product
router.route("/").get(getProducts).post(protectAdmin, isAdmin, createProduct);

// Get draft products
router.route("/drafts").get(protectAdmin, isAdmin, getDraftProducts);

// Get featured products
router.route("/featured").get(getFeaturedProducts);

// Get best selling products
router.route("/bestsellers").get(getBestSellerProducts);

// Get variable products
router.route("/type/variable").get(getVariableProducts);

// Get all product categories
router.route("/categories").get(getProductCategories);

// Get products by category
router.route("/category/:slug").get(getProductsByCategory);

// Search products by keyword
router.route("/search").get(searchProductsByKeyword);
router.route("/searchbybrand").get(searchBranchProducts);
// Get single product by ID
router
  .route("/:id")
  .get(getProductById)
  .put(protectAdmin, isAdmin, updateProduct)
  .delete(protectAdmin, isAdmin, deleteProduct);

router.route("/slug/:slug").get(getProductBySlug);

module.exports = router;
