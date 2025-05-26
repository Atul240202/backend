require("dotenv").config();
const mongoose = require("mongoose");
const {
  calculateBestSellers,
  calculateLifetimeBestSellers,
} = require("../utils/calculateBestSellers");

const MONGO_URI = process.env.MONGO_URI;

const runJob = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🔌 Connected to MongoDB");

    await calculateBestSellers("week");
    await calculateBestSellers("month");
    await calculateLifetimeBestSellers();

    console.log("🎉 Best-seller cron job completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Cron job failed:", error);
    process.exit(1);
  }
};

runJob();
