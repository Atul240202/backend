const express = require("express");
const router = express.Router();
const {
  protect,
  protectAdmin,
  isAdmin,
} = require("../middleware/authMiddleware");
const {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  getUserGstNo,
  updateUserGst,
  getAllUsersForAdmin,
  searchUsersByKeyword,
  getUserInsights,
} = require("../controllers/userController");

// Protect all user routes
router.use(protect);

router.get("/admin/users", protectAdmin, isAdmin, getAllUsersForAdmin);
router.get("/admin/search", protectAdmin, isAdmin, searchUsersByKeyword);

// User profile routes
router.route("/profile").get(getUserProfile).put(updateUserProfile);

// User profile gst routes
router.route("/usergst").get(getUserGstNo).put(updateUserGst);

// User addresses routes
router.route("/addresses").get(getUserAddresses).post(addUserAddress);

router
  .route("/addresses/:addressId")
  .put(updateUserAddress)
  .delete(deleteUserAddress);

router.route("/addresses/:addressId/default").put(setDefaultAddress);
router.get("/admin/user-insights", protectAdmin, isAdmin, getUserInsights);

module.exports = router;
