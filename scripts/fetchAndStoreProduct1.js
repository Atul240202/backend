const axios = require("axios");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const {
  fetchAndSaveVariations,
  loadVariationProgress,
  saveVariationProgress,
} = require("./fetchVariableProducts");
// MongoDB connection URI
const MONGO_URI =
  "mongodb+srv://atuljha2402:ksleVRv3u6uhGVE8@industrywaala.bafcc.mongodb.net/test?retryWrites=true&w=majority";

// WooCommerce API details
const BASE_URL = "https://testindustrywaala.in/wp-json/wc/v3/products";
const CONSUMER_KEY = "ck_61e793a205b52df9e370aeece3e8b866125c81f2";
const CONSUMER_SECRET = "cs_189f54d0813028290c562ea058972574bcc0866f";
const PER_PAGE = 100;
const TARGET_PRODUCTS = 40000;

// Progress tracking file
const PROGRESS_FILE = "./migration-progress.json";

// Define the product schema
const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    slug: { type: String },
    permalink: { type: String },
    date_created: { type: String },
    date_created_gmt: { type: String },
    date_modified: { type: String },
    date_modified_gmt: { type: String },
    type: { type: String },
    status: { type: String },
    featured: { type: Boolean },
    catalog_visibility: { type: String },
    description: { type: String },
    sku: { type: String },
    price: { type: String },
    regular_price: { type: String },
    sale_price: { type: String },
    date_on_sale_from: { type: String, default: null },
    date_on_sale_from_gmt: { type: String, default: null },
    date_on_sale_to: { type: String, default: null },
    date_on_sale_to_gmt: { type: String, default: null },
    on_sale: { type: Boolean },
    purchasable: { type: Boolean },
    total_sales: { type: Number },
    virtual: { type: Boolean },
    downloadable: { type: Boolean },
    downloads: [{ type: Object }],
    download_limit: { type: Number },
    download_expiry: { type: Number },
    external_url: { type: String },
    button_text: { type: String },
    tax_status: { type: String },
    tax_class: { type: String },
    manage_stock: { type: Boolean },
    stock_quantity: { type: Number, default: null },
    backorders: { type: String },
    backorders_allowed: { type: Boolean },
    backordered: { type: Boolean },
    low_stock_amount: { type: Number, default: null },
    sold_individually: { type: Boolean },
    weight: { type: String },
    dimensions: {
      length: { type: String },
      width: { type: String },
      height: { type: String },
    },
    shipping_required: { type: Boolean },
    shipping_taxable: { type: Boolean },
    shipping_class: { type: String },
    shipping_class_id: { type: Number },
    reviews_allowed: { type: Boolean },
    average_rating: { type: String },
    rating_count: { type: Number },
    upsell_ids: [{ type: Number }],
    cross_sell_ids: [{ type: Number }],
    parent_id: { type: Number },
    purchase_note: { type: String },
    categories: [{ id: Number, name: String, slug: String }],
    tags: [{ id: Number, name: String, slug: String }],
    images: [
      {
        id: Number,
        date_created: String,
        date_created_gmt: String,
        date_modified: String,
        date_modified_gmt: String,
        src: String,
        name: String,
        alt: String,
      },
    ],
    attributes: [{ id: Number, name: String, options: [String] }],
    default_attributes: [{ name: String, option: String }],
    // variations: [
    //   {
    //     id: { type: Number, required: true },
    //     sku: { type: String },
    //     price: { type: String },
    //     regular_price: { type: String },
    //     sale_price: { type: String },
    //     stock_status: { type: String },
    //     stock_quantity: { type: Number, default: null },
    //     image: {
    //       id: Number,
    //       src: String,
    //       alt: String,
    //     },
    //     attributes: [{ name: String, option: String }],
    //   },
    // ],
    variations: [{ type: Number }],
    grouped_products: [{ type: Number }],
    menu_order: { type: Number },
    price_html: { type: String },
    related_ids: [{ type: Number }],
    meta_data: [
      { id: Number, key: String, value: mongoose.Schema.Types.Mixed },
    ],
    stock_status: { type: String },
    has_options: { type: Boolean },
    post_password: { type: String },
    global_unique_id: { type: String },
    yoast_head: { type: String },
    _links: {
      self: [{ href: String }],
      collection: [{ href: String }],
    },
  },
  { timestamps: true }
);

// Create the Product model
const Product = mongoose.model("MainProducts", productSchema);

// Function to save progress
async function saveProgress(page, fetchedProducts) {
  try {
    await fs.writeFile(
      PROGRESS_FILE,
      JSON.stringify({ page, fetchedProducts, lastUpdated: new Date() })
    );
  } catch (error) {
    console.error("Error saving progress:", error.message);
  }
}

// Function to load progress
async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, "utf8");
    const progress = JSON.parse(data);
    return progress;
  } catch (error) {
    return { page: 1, fetchedProducts: 0 };
  }
}

// Function to parse product data
function parseProduct(product) {
  return {
    id: product.id,
    name: product.name || "no name",
    slug: product.slug,
    permalink: product.permalink,
    date_created: product.date_created,
    date_created_gmt: product.date_created_gmt,
    date_modified: product.date_modified,
    date_modified_gmt: product.date_modified_gmt,
    type: product.type,
    status: product.status,
    featured: product.featured,
    catalog_visibility: product.catalog_visibility,
    description: product.description,
    sku: product.sku,
    price: product.price,
    regular_price: product.regular_price,
    sale_price: product.sale_price,
    date_on_sale_from: product.date_on_sale_from,
    date_on_sale_from_gmt: product.date_on_sale_from_gmt,
    date_on_sale_to: product.date_on_sale_to,
    date_on_sale_to_gmt: product.date_on_sale_to_gmt,
    on_sale: product.on_sale,
    purchasable: product.purchasable,
    total_sales: product.total_sales,
    virtual: product.virtual,
    downloadable: product.downloadable,
    downloads: product.downloads,
    download_limit: product.download_limit,
    download_expiry: product.download_expiry,
    external_url: product.external_url,
    button_text: product.button_text,
    tax_status: product.tax_status,
    tax_class: product.tax_class,
    manage_stock: product.manage_stock,
    stock_quantity: product.stock_quantity,
    backorders: product.backorders,
    backorders_allowed: product.backorders_allowed,
    backordered: product.backordered,
    low_stock_amount: product.low_stock_amount,
    sold_individually: product.sold_individually,
    weight: product.weight,
    dimensions: {
      length: product.dimensions?.length || "",
      width: product.dimensions?.width || "",
      height: product.dimensions?.height || "",
    },
    shipping_required: product.shipping_required,
    shipping_taxable: product.shipping_taxable,
    shipping_class: product.shipping_class,
    shipping_class_id: product.shipping_class_id,
    reviews_allowed: product.reviews_allowed,
    average_rating: product.average_rating,
    rating_count: product.rating_count,
    upsell_ids: product.upsell_ids,
    cross_sell_ids: product.cross_sell_ids,
    parent_id: product.parent_id,
    purchase_note: product.purchase_note,
    categories:
      product.categories?.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      })) || [],
    tags:
      product.tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })) || [],
    images:
      product.images?.map((img) => ({
        id: img.id,
        date_created: img.date_created,
        date_created_gmt: img.date_created_gmt,
        date_modified: img.date_modified,
        date_modified_gmt: img.date_modified_gmt,
        src: img.src,
        name: img.name,
        alt: img.alt,
      })) || [],
    attributes:
      product.attributes?.map((attr) => ({
        id: attr.id,
        name: attr.name,
        options: attr.options,
      })) || [],
    default_attributes:
      product.default_attributes?.map((attr) => ({
        name: attr.name,
        option: attr.option,
      })) || [],
    // variations:
    //   product.variations?.map((variation) => ({
    //     id: variation.id,
    //     sku: variation.sku || '',
    //     price: variation.price || '0',
    //     regular_price: variation.regular_price || '0',
    //     sale_price: variation.sale_price || '0',
    //     stock_status: variation.stock_status || 'outofstock',
    //     stock_quantity: variation.stock_quantity ?? null,
    //     image: variation.image
    //       ? {
    //           id: variation.image.id || null,
    //           src: variation.image.src || '',
    //           alt: variation.image.alt || '',
    //         }
    //       : null,
    //     attributes:
    //       variation.attributes?.map((attr) => ({
    //         name: attr.name || '',
    //         option: attr.option || '',
    //       })) || [],
    //   })) || [],
    variations: product.variations || [],
    grouped_products: product.grouped_products,
    menu_order: product.menu_order,
    price_html: product.price_html,
    related_ids: product.related_ids,
    meta_data:
      product.meta_data?.map((meta) => ({
        id: meta.id,
        key: meta.key,
        value: meta.value,
      })) || [],
    stock_status: product.stock_status,
    has_options: product.has_options,
    post_password: product.post_password,
    global_unique_id: product.global_unique_id,
    yoast_head: product.yoast_head,
    _links: {
      self: product._links?.self || [],
      collection: product._links?.collection || [],
    },
  };
}

// Main function to fetch and store products with resume capability
async function fetchAndStoreProductsResumable() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Load progress if available
    const progress = await loadProgress();
    let page = progress.page;
    let fetchedProducts = progress.fetchedProducts;

    // Set up retry mechanism
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds

    while (fetchedProducts < TARGET_PRODUCTS) {
      const url = `${BASE_URL}?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}&per_page=${PER_PAGE}&page=${page}`;
      let retries = 0;
      let success = false;

      while (!success && retries < MAX_RETRIES) {
        try {
          const response = await axios.get(url, {
            timeout: 30000, // 30 second timeout
            headers: {
              "User-Agent": "WooCommerce Migration Script",
            },
          });

          const products = response.data;

          if (products.length === 0) {
            break; // Stop if no more products are available
          }

          // Parse products
          const parsedProducts = products.map(parseProduct);

          // Check if products already exist to avoid duplicates
          const productIds = parsedProducts.map((p) => p.id);
          const existingProducts = await Product.find({
            id: { $in: productIds },
          });
          const existingIds = new Set(existingProducts.map((p) => p.id));

          // Filter out products that already exist
          const newProducts = parsedProducts.filter(
            (p) => !existingIds.has(p.id)
          );

          if (newProducts.length > 0) {
            // Insert the new products into MongoDB
            await Product.insertMany(newProducts);
            const variationProgress = await loadVariationProgress();
            const variableProducts = newProducts.filter(
              (p) => p.type === "variable"
            );

            for (const parent of variableProducts) {
              if (variationProgress.has(parent.id)) {
                continue;
              }

              await fetchAndSaveVariations(parent);
              variationProgress.add(parent.id);
              await saveVariationProgress(variationProgress);
            }
          } else {
            console.log(
              `All ${products.length} products already exist in the database. Skipping.`
            );
          }

          fetchedProducts += products.length;

          // Save progress after each successful page
          await saveProgress(page + 1, fetchedProducts);

          success = true;
          page++; // Move to the next page

          if (fetchedProducts >= TARGET_PRODUCTS) {
            console.log(`Fetched ${fetchedProducts} products. Target reached.`);
            break;
          }
        } catch (error) {
          retries++;
          console.error(
            `Error fetching products (attempt ${retries}/${MAX_RETRIES}):`,
            error.message
          );

          if (retries < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          } else {
            console.error("Max retries reached. Saving progress and exiting.");
            await saveProgress(page, fetchedProducts);
            break;
          }
        }
      }

      if (!success) {
        break; // Exit the main loop if all retries failed
      }
    }

    console.log(`Total products fetched: ${fetchedProducts}`);
  } catch (error) {
    console.error("Unexpected error:", error.message);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Function to resume migration from where it left off
async function resumeMigration() {
  console.log("🚀 Resuming WooCommerce Data Migration...");
  await fetchAndStoreProductsResumable();
  console.log("🎉 Migration completed or paused!");
}

// Main migration function that can start fresh or resume
async function migrateWooCommerceData(resume = true) {
  if (resume) {
    await resumeMigration();
  } else {
    // If not resuming, delete progress file and start fresh
    try {
      await fs.unlink(PROGRESS_FILE);
      console.log("Starting fresh migration (deleted previous progress)");
    } catch (error) {
      // File might not exist, which is fine
    }
    console.log("🚀 Starting fresh WooCommerce Data Migration...");
    await fetchAndStoreProductsResumable();
    console.log("🎉 Migration completed!");
  }
}

// Run the migration with resume=true to continue from where it left off
migrateWooCommerceData(true);
