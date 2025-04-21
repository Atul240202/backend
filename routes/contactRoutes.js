const express = require("express");
const router = express.Router();
const { sendContactMail } = require("../controllers/contactController");
const {
  protectAdmin,
  isAdmin,
  protect,
} = require("../middleware/authMiddleware");

router.post("/contact", protect, sendContactMail);

module.exports = router;
