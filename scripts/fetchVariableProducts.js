// ⚙️ Add this import at the top
const ProductVariation = require("../models/ProductVariation");
const BASE_URL = "https://testindustrywaala.in/wp-json/wc/v3/products";
const CONSUMER_KEY = "ck_61e793a205b52df9e370aeece3e8b866125c81f2";
const CONSUMER_SECRET = "cs_189f54d0813028290c562ea058972574bcc0866f";
const VARIATION_PROGRESS_FILE = "./variation-progress.json";
const axios = require("axios");
const fs = require("fs/promises");

// 🧠 Helper to fetch and store variations in a separate schema
async function fetchAndSaveVariations(parentProduct) {
  const productId = parentProduct.id;
  const url = `${BASE_URL}/${productId}/variations?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`;

  try {
    const response = await axios.get(url);
    const variations = response.data;
    const variationMongoIds = [];

    for (const variation of variations) {
      const variationData = {
        id: variation.id,
        name: `${parentProduct.name} - ${variation.attributes
          .map((a) => a.option)
          .join(" ")}`,
        slug: `${parentProduct.slug}-v${variation.id}`,
        parent_id: productId,
        type: "variation",
        permalink: variation.permalink,
        description: variation.description,
        sku: variation.sku || "",
        price: variation.price || "0",
        regular_price: variation.regular_price || "0",
        sale_price: variation.sale_price || "0",
        on_sale: variation.on_sale,
        status: variation.status,
        purchasable: variation.purchasable,
        virtual: variation.virtual,
        downloadable: variation.downloadable,
        downloads: variation.downloads,
        download_limit: variation.download_limit,
        download_expiry: variation.download_expiry,
        tax_status: variation.tax_status,
        tax_class: variation.tax_class,
        manage_stock: variation.manage_stock,
        stock_quantity: variation.stock_quantity,
        stock_status: variation.stock_status,
        backorders: variation.backorders,
        backorders_allowed: variation.backorders_allowed,
        backordered: variation.backordered,
        weight: variation.weight,
        dimensions: variation.dimensions || {},
        shipping_class: variation.shipping_class,
        shipping_class_id: variation.shipping_class_id,
        image: variation.image ? [variation.image] : [],
        attributes: variation.attributes || [],
        menu_order: variation.menu_order,
        meta_data: variation.meta_data,
        _links: variation._links,
      };

      const saved = await ProductVariation.create(variationData);
      variationMongoIds.push(saved._id);
    }

    await Product.updateOne(
      { id: parentProduct.id },
      { $set: { variations: variationMongoIds } }
    );

    console.log(
      `✅ Stored ${variationMongoIds.length} variations for product ${productId}`
    );
  } catch (err) {
    console.error(
      `❌ Error saving variations for product ${productId}:`,
      err.message
    );
  }
}

async function loadVariationProgress() {
  try {
    const data = await fs.readFile(VARIATION_PROGRESS_FILE, "utf8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

// Save updated list of completed variation product IDs
async function saveVariationProgress(completedIds) {
  const data = JSON.stringify([...completedIds]);
  await fs.writeFile(VARIATION_PROGRESS_FILE, data);
}

module.exports = {
  fetchAndSaveVariations,
  loadVariationProgress,
  saveVariationProgress,
};
