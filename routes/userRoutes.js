const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
} = require('../controllers/userController');

// Protect all user routes
router.use(protect);

// User profile routes
router.route('/profile').get(getUserProfile).put(updateUserProfile);

// User addresses routes
router.route('/addresses').get(getUserAddresses).post(addUserAddress);

router
  .route('/addresses/:addressId')
  .put(updateUserAddress)
  .delete(deleteUserAddress);

router.route('/addresses/:addressId/default').put(setDefaultAddress);

module.exports = router;
