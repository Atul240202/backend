const asyncHandler = require("express-async-handler");
const ProductCategory = require("../models/ProductCategory");

// @desc    Fetch all product categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await ProductCategory.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Fetch a single category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  try {
    const category = await ProductCategory.findOne({ id: req.params.id });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Create a new product category
// @route   POST /api/categories
// @access  Admin
const createCategory = asyncHandler(async (req, res) => {
  let {
    id,
    name,
    slug,
    parent,
    description,
    display,
    image,
    menu_order,
    count,
  } = req.body;

  if (!id) {
    const last = await ProductCategory.findOne({}).sort({ id: -1 });
    id = last ? last.id + 1 : 1;
  }

  // Check if category already exists
  const exists = await ProductCategory.findOne({ id });
  if (exists) {
    return res
      .status(400)
      .json({ message: "Category with this ID already exists" });
  }

  const newCategory = new ProductCategory({
    id,
    name,
    slug,
    parent,
    description,
    display,
    image,
    menu_order,
    count,
  });

  try {
    const savedCategory = await newCategory.save();
    res.status(201).json({
      message: "Category created successfully",
      category: savedCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Update an existing category
// @route   PUT /api/categories/:id
// @access  Admin
const updateCategory = asyncHandler(async (req, res) => {
  const updatedData = req.body;

  const category = await ProductCategory.findOne({ id: req.params.id });
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  Object.assign(category, updatedData);
  const updatedCategory = await category.save();

  res.status(200).json({
    message: "Category updated successfully",
    category: updatedCategory,
  });
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await ProductCategory.findOne({ id: req.params.id });

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  await category.deleteOne();

  res.status(200).json({ message: "Category deleted successfully" });
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
