const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");

// @desc    Add new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const data = req.body;

  // Validate essential fields
  if (!data.name || !data.price) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  const lastProduct = await Product.findOne().sort({ id: -1 });
  const newId = lastProduct ? lastProduct.id + 1 : 1;

  const product = new Product({
    ...data,
    id: newId,
    date_created: new Date().toISOString(),
    date_created_gmt: new Date().toUTCString(),
  });

  const createdProduct = await product.save();
  res.status(201).json({ success: true, product: createdProduct });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const updates = req.body;

  const product = await Product.findOne({ id: productId });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  Object.assign(product, updates);
  product.date_modified = new Date().toISOString();
  product.date_modified_gmt = new Date().toUTCString();

  const updatedProduct = await product.save();
  res.json({ success: true, product: updatedProduct });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findOneAndDelete({ id: productId });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.json({
    success: true,
    message: `Product '${product.name}' deleted successfully.`,
  });
});

// @desc    Fetch all products with search and pagination
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword || "";

  const searchFilter = keyword
    ? {
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      }
    : {};

  const filter = {
    ...searchFilter,
    status: { $ne: "draft" },
  };

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .limit(limit)
    .skip(limit * (page - 1));

  res.json({
    products,
    page,
    pages: Math.ceil(total / limit), // Renamed here
    total,
  });
});

// @desc    Fetch all draft products
// @route   GET /api/products/drafts
// @access  Admin (or Authenticated User)
const getDraftProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ status: "draft" }).sort({
    createdAt: -1,
  });
  res.json({
    products,
    total: products.length,
  });
});

// @desc    Search products by keyword
// @route   GET /api/products/search
// @access  Public
const searchProductsByKeyword = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword || "";
  const limit = Number(req.query.limit) || 10;

  if (keyword.trim() === "") {
    return res.json({ products: [], total: 0 });
  }

  const searchQuery = {
    $or: [
      { title: { $regex: keyword, $options: "i" } },
      // { description: { $regex: keyword, $options: "i" } },
      // { "brand.name": { $regex: keyword, $options: "i" } },
    ],
  };

  const count = await Product.countDocuments(searchQuery);
  const products = await Product.find(searchQuery).limit(limit);

  res.json({ products, total: count });
});

// @desc    Search products by brand
// @route   GET /api/products/searchbybrand
// @access  Public
const searchBranchProducts = asyncHandler(async (req, res) => {
  console.log("search by brand called");
  const pageSize = Number(req.query.limit) || 50;
  const page = Number(req.query.page) || 1;
  const keyword = req.query.keyword || "";

  const searchQuery = {
    brand: { $regex: keyword, $options: "i" },
  };

  const count = await Product.countDocuments(searchQuery);
  const products = await Product.find(searchQuery)
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
    keyword,
  });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  // Extract the ID from the slug-id format
  const urlParts = req.params.id.split("-");
  const productId = urlParts[urlParts.length - 1];

  // Find the product by the extracted ID
  const product = await Product.findOne({ id: productId });

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Fetch single product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
const getProductBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug;

  const product = await Product.findOne({ slug });

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Fetch products by category
// @route   GET /api/products/category/:slug
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
  const pageSize = 50;
  const page = Number(req.query.pageNumber) || 1;

  const categorySlug = req.params.slug;

  // Special case for "all" category - fetch uncategorized products
  const filter =
    categorySlug === "all"
      ? { "categories.name": "Uncategorized" }
      : { "categories.slug": categorySlug };

  const count = await Product.countDocuments(filter);

  // For "all" category, sort alphabetically by name
  const sortOption = categorySlug === "all" ? { name: 1 } : {};

  const products = await Product.find(filter)
    .sort(sortOption)
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
    category: categorySlug,
  });
});

// @desc    Fetch featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;

  const products = await Product.find({ featured: true }).limit(limit);

  res.json(products);
});

// @desc    Fetch best selling products
// @route   GET /api/products/bestsellers
// @access  Public
const getBestSellerProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 5;

  const products = await Product.find({})
    .sort({ total_sales: -1 })
    .limit(limit);

  res.json(products);
});

// @desc    Fetch products whose type is variable
// @route   GET /api/products/variable
// @access  Public
const getVariableProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ type: "variable" });
  res.json(products);
});

// @desc    Get all product categories
// @route   GET /api/products/categories
// @access  Public
const getProductCategories = asyncHandler(async (req, res) => {
  // Use aggregation to get unique categories
  const categories = await Product.aggregate([
    { $unwind: "$categories" },
    {
      $group: {
        _id: "$categories.id",
        name: { $first: "$categories.name" },
        slug: { $first: "$categories.slug" },
      },
    },
    { $sort: { name: 1 } },
  ]);

  res.json(categories);
});

module.exports = {
  getProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  getBestSellerProducts,
  getVariableProducts,
  getProductCategories,
  searchProductsByKeyword,
  searchBranchProducts,
  deleteProduct,
  updateProduct,
  createProduct,
  getDraftProducts,
  getProductBySlug,
};
