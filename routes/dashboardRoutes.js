const express = require("express");
const router = express.Router();
const { getDashboardInsights } = require("../controllers/dashboardController");
const { protectAdmin, isAdmin } = require("../middleware/authMiddleware");

router.get("/dashboard-insights", protectAdmin, isAdmin, getDashboardInsights);

module.exports = router;
