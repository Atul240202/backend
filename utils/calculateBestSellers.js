const FinalOrder = require("../models/FinalOrder");
const Product = require("../models/Product");
const BestSellerCache = require("../models/BestSellerCache");

const transformProductForCache = (p, totalSold) => {
  return {
    id: p.id,
    name: p.name,
    description: String(p.description || ""),
    price: String(p.price || "0"),
    regular_price: String(p.regular_price || "0"),
    sale_price: String(p.sale_price || "0"),
    on_sale: !!p.on_sale,
    average_rating: String(p.average_rating || "0"),
    stock_status: p.stock_status || "outofstock",
    images: Array.isArray(p.images)
      ? p.images.map((img) => ({
          id: img.id,
          src: String(img.src || ""),
          name: String(img.name || ""),
          alt: String(img.alt || ""),
        }))
      : [],
    categories: Array.isArray(p.categories)
      ? p.categories.map((cat) => ({
          id: cat.id,
          name: String(cat.name || ""),
          slug: String(cat.slug || ""),
        }))
      : [],
    slug: String(p.slug || ""),
    sku: String(p.sku || ""),
    type: String(p.type || "simple"),
    variations: Array.isArray(p.variations)
      ? p.variations.filter((v) => !isNaN(v)).map((v) => Number(v))
      : [],
    status: String(p.status || "publish"),
  };
};

const calculateBestSellers = async (range) => {
  const now = new Date();
  let startDate;

  if (range === "week") {
    startDate = new Date();
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const result = await FinalOrder.aggregate([
    { $unwind: "$order_items" },
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: "$order_items.id",
        totalSold: { $sum: { $toInt: "$order_items.units" } },
        name: { $first: "$order_items.name" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 20 },
  ]);

  const enriched = await Promise.all(
    result.map(async (item) => {
      const p = await Product.findOne({ id: Number(item._id) });
      if (!p) return null;
      return transformProductForCache(p, item.totalSold);
    })
  );

  const validProducts = enriched.filter(Boolean);

  if (validProducts.length === 0) {
    console.log(`⚠️ No best-selling data found for '${range}'`);
    return;
  }

  await BestSellerCache.findOneAndUpdate(
    { range },
    {
      range,
      generatedAt: new Date(),
      products: validProducts,
    },
    { upsert: true }
  );

  console.log(`✅ Best sellers for '${range}' updated.`);
  validProducts.forEach((item, index) =>
    console.log(`${index + 1}. ${item.name}`)
  );
};

const calculateLifetimeBestSellers = async () => {
  const topProducts = await Product.find({})
    .sort({ total_sales: -1 })
    .limit(50);

  const formatted = topProducts.map((p) =>
    transformProductForCache(p, p.total_sales || 0)
  );

  await BestSellerCache.findOneAndUpdate(
    { range: "lifetime" },
    {
      range: "lifetime",
      generatedAt: new Date(),
      products: formatted,
    },
    { upsert: true }
  );

  console.log("✅ Lifetime best sellers updated.\n");
  formatted.forEach((item, idx) => console.log(`${idx + 1}. ${item.name}`));
};

module.exports = { calculateBestSellers, calculateLifetimeBestSellers };
