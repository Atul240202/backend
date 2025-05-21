const mongoose = require("mongoose");
const Product = require("../models/Product"); // MainProducts model
const {
  fetchAndSaveVariations,
  loadVariationProgress,
  saveVariationProgress,
} = require("./fetchVariableProducts");
const axios = require("axios");

const MONGO_URI =
  "mongodb+srv://atuljha2402:ksleVRv3u6uhGVE8@industrywaala.bafcc.mongodb.net/test?retryWrites=true&w=majority";
async function migrateAllVariationsFromDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const variationProgress = await loadVariationProgress();

    const variableProducts = await Product.find({ type: "variable" });

    for (const product of variableProducts) {
      if (variationProgress.has(product.id)) {
        console.log(`⏩ Skipping product ${product.id} (already processed)`);
        continue;
      }

      await fetchAndSaveVariations(product);
      variationProgress.add(product.id);
      await saveVariationProgress(variationProgress);
    }

    console.log("🎉 All variations fetched and stored successfully.");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB connection closed");
  }
}

migrateAllVariationsFromDB();
