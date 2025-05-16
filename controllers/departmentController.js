const asyncHandler = require("express-async-handler");
const ProductDepartment = require("../models/ProductDepartment");

// @desc    Fetch all product categories
// @route   GET /api/department
// @access  Public
const getDepartment = asyncHandler(async (req, res) => {
  try {
    const categories = await ProductDepartment.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Fetch a single department by ID
// @route   GET /api/department/:id
// @access  Public
const getDepartmentById = asyncHandler(async (req, res) => {
  try {
    const department = await ProductDepartment.findOne({ id: req.params.id });

    if (!department) {
      return res.status(404).json({ message: "department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Create a new product department
// @route   POST /api/department
// @access  Admin
const createDepartment = asyncHandler(async (req, res) => {
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
    const last = await ProductDepartment.findOne({}).sort({ id: -1 });
    id = last ? last.id + 1 : 1;
  }

  // Check if department already exists
  const exists = await ProductDepartment.findOne({ id });
  if (exists) {
    return res
      .status(400)
      .json({ message: "department with this ID already exists" });
  }

  const newdepartment = new ProductDepartment({
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
    const saveddepartment = await newdepartment.save();
    res.status(201).json({
      message: "department created successfully",
      department: saveddepartment,
    });
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Update an existing department
// @route   PUT /api/department/:id
// @access  Admin
const updateDepartment = asyncHandler(async (req, res) => {
  const updatedData = req.body;

  const department = await ProductDepartment.findOne({ id: req.params.id });
  if (!department) {
    return res.status(404).json({ message: "department not found" });
  }

  Object.assign(department, updatedData);
  const updateddepartment = await department.save();

  res.status(200).json({
    message: "department updated successfully",
    department: updateddepartment,
  });
});

// @desc    Delete a department
// @route   DELETE /api/department/:id
// @access  Admin
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await ProductDepartment.findOne({ id: req.params.id });

  if (!department) {
    return res.status(404).json({ message: "department not found" });
  }

  await department.deleteOne();

  res.status(200).json({ message: "department deleted successfully" });
});

module.exports = {
  getDepartment,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
