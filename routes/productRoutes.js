const express = require('express');
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
} = require('../controllers/productController');

// Get all products
router.route('/').get(getProducts);

// Get featured products
router.route('/featured').get(getFeaturedProducts);

// Get best selling products
router.route('/bestsellers').get(getBestSellerProducts);

// Get variable products
router.route('/type/variable').get(getVariableProducts);

// Get all product categories
router.route('/categories').get(getProductCategories);

// Get products by category
router.route('/category/:slug').get(getProductsByCategory);

// Get single product by ID
router.route('/:id').get(getProductById);

// Search products by keyword
router.route('/search').get(searchProductsByKeyword);
router.route('/searchbybrand').get(searchBranchProducts);

module.exports = router;
