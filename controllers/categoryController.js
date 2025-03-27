const asyncHandler = require('express-async-handler');
const ProductCategory = require('../models/ProductCategory');

// @desc    Fetch all product categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await ProductCategory.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Fetch a single category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  try {
    const category = await ProductCategory.findOne({ id: req.params.id });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = {
  getCategories,
  getCategoryById,
};
