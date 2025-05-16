const express = require("express");
const router = express.Router();
const {
  getDepartment,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
const {
  protect,
  protectAdmin,
  isAdmin,
} = require("../middleware/authMiddleware");

// Get all Departments
router
  .route("/")
  .get(getDepartment)
  .post(protectAdmin, isAdmin, createDepartment);

// Get Department by ID
router
  .route("/:id")
  .get(getDepartmentById)
  .put(protectAdmin, isAdmin, updateDepartment)
  .delete(protectAdmin, isAdmin, deleteDepartment);

module.exports = router;
