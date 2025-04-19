const asyncHandler = require("express-async-handler");
const FinalOrder = require("../models/FinalOrder");
const UnprocessedOrder = require("../models/UnprocessedOrder");
const Product = require("../models/Product");
const User = require("../models/User");
const ProductCategory = require("../models/ProductCategory");

const getDashboardInsights = asyncHandler(async (req, res) => {
  const [
    totalRevenueData,
    totalOrders,
    totalCustomers,
    abandonedOrders,
    statusCounts,
    recentOrders,
    recentUsers,
    categoryCount,
    parentCategoryCount,
    _unusedTopProducts,
    totalProducts,
  ] = await Promise.all([
    FinalOrder.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $add: [
                { $toDouble: "$sub_total" },
                { $toDouble: "$shipping_charges" },
              ],
            },
          },
        },
      },
    ]),
    FinalOrder.countDocuments(),
    User.countDocuments(),
    UnprocessedOrder.countDocuments(),
    FinalOrder.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    FinalOrder.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("order_id sub_total shipping_charges createdAt"),
    User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt"),
    ProductCategory.countDocuments(),
    ProductCategory.countDocuments({ parent: 0 }),
    FinalOrder.aggregate([
      // 👈 replace this block with _unusedTopProducts to indicate it's unused now
      { $unwind: "$order_items" },
      {
        $group: {
          _id: "$order_items.id",
          sold: { $sum: "$order_items.units" },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ]),
    Product.countDocuments(),
  ]);

  const totalRevenue = totalRevenueData[0]?.total || 0;
  const subCategoryCount = categoryCount - parentCategoryCount;

  // ✅ NEW: Fetch top products using stored total_sales
  const topSellingProducts = await Product.find({})
    .sort({ total_sales: -1 })
    .limit(5)
    .select("id name image price sale_price total_sales");

  const popularProducts = topSellingProducts.map((prod) => ({
    id: prod.id,
    name: prod.name,
    image: prod.image || null,
    price: prod.sale_price || prod.price || 0,
    sold: prod.total_sales || 0,
  }));

  const statusMap = {};
  statusCounts.forEach((s) => {
    statusMap[s._id] = s.count;
  });

  res.json({
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    abandonedOrders,
    statusCounts: {
      pending: statusMap.pending || 0,
      processing: statusMap.processing || 0,
      shipped: statusMap.shipped || 0,
      delivered: statusMap.delivered || 0,
      returned: statusMap.returned || 0,
    },
    recentOrders: recentOrders.map((o) => ({
      order_id: o.order_id,
      amount: parseFloat(o.sub_total) + parseFloat(o.shipping_charges),
      date: o.createdAt,
    })),
    recentUsers: recentUsers.map((u) => ({
      name: u.name || u.email,
      registeredAt: u.createdAt,
    })),
    categoryStats: {
      total: categoryCount,
      parent: parentCategoryCount,
      sub: subCategoryCount,
    },
    popularProducts,
  });
});

module.exports = {
  getDashboardInsights,
};
