const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
} = require('../controllers/categoryController');

// Get all categories
router.route('/').get(getCategories);

// Get category by ID
router.route('/:id').get(getCategoryById);

module.exports = router;
