const UnprocessedOrder = require('../models/UnprocessedOrder');
const asyncHandler = require('express-async-handler');

// @desc    Create a new unprocessed order
// @route   POST /api/unprocessed-orders
// @access  Private
const createUnprocessedOrder = asyncHandler(async (req, res) => {
  const {
    tempId,
    products,
    shippingAddress,
    billingAddress,
    subtotal,
    shipping,
    total,
    reason,
  } = req.body;

  // First, check if the user already has any unprocessed orders with the same products
  // This helps prevent duplicate orders from different parts of the checkout flow
  let existingOrder = null;

  // If tempId is provided, try to find by tempId first
  if (tempId) {
    existingOrder = await UnprocessedOrder.findOne({ tempId });
  }

  // If no tempId or no order found by tempId, try to find by userId and product IDs
  if (!existingOrder) {
    // Extract product IDs from the request
    const productIds = products.map((p) => p.id);

    // Find orders by this user that have the same products
    const userOrders = await UnprocessedOrder.find({
      userId: req.user._id,
      'products.id': { $in: productIds },
    }).sort({ createdAt: -1 }); // Get the most recent one

    if (userOrders.length > 0) {
      existingOrder = userOrders[0];
    }
  }

  if (existingOrder) {
    // Update the existing order
    existingOrder.products = products;

    // Only update addresses if they are provided and not "pending"
    if (shippingAddress && shippingAddress.id !== 'pending') {
      existingOrder.shippingAddress = shippingAddress;
    }

    if (billingAddress) {
      existingOrder.billingAddress = billingAddress;
    }

    existingOrder.subtotal = subtotal;
    existingOrder.shipping = shipping;
    existingOrder.total = total;
    existingOrder.reason = reason;
    existingOrder.updatedAt = Date.now();

    // If a new tempId is provided, update it
    if (tempId && existingOrder.tempId !== tempId) {
      existingOrder.tempId = tempId;
    }

    await existingOrder.save();

    res.status(200).json({
      success: true,
      message: 'Unprocessed order updated successfully',
      data: existingOrder,
    });
  } else {
    // Create a new unprocessed order
    const unprocessedOrder = new UnprocessedOrder({
      tempId,
      userId: req.user._id,
      products,
      shippingAddress,
      billingAddress,
      subtotal,
      shipping,
      total,
      reason,
    });

    const createdOrder = await unprocessedOrder.save();

    res.status(201).json({
      success: true,
      message: 'Unprocessed order created successfully',
      data: createdOrder,
    });
  }
});

// @desc    Get all unprocessed orders for a user
// @route   GET /api/unprocessed-orders
// @access  Private
const getUserUnprocessedOrders = asyncHandler(async (req, res) => {
  const unprocessedOrders = await UnprocessedOrder.find({
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    count: unprocessedOrders.length,
    data: unprocessedOrders,
  });
});

// @desc    Get all unprocessed orders (admin only)
// @route   GET /api/unprocessed-orders/all
// @access  Private/Admin
const getAllUnprocessedOrders = asyncHandler(async (req, res) => {
  // Add pagination
  const page = Number.parseInt(req.query.page) || 1;
  const limit = Number.parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter object based on query parameters
  const filter = {};

  if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  if (req.query.reason) {
    filter.reason = { $regex: req.query.reason, $options: 'i' }; // Case-insensitive search
  }

  if (req.query.fromDate && req.query.toDate) {
    filter.createdAt = {
      $gte: new Date(req.query.fromDate),
      $lte: new Date(req.query.toDate),
    };
  }

  // Count total documents for pagination
  const total = await UnprocessedOrder.countDocuments(filter);

  // Get orders with pagination
  const unprocessedOrders = await UnprocessedOrder.find(filter)
    .sort({ createdAt: -1 }) // Sort by most recent first
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email');

  res.status(200).json({
    success: true,
    count: unprocessedOrders.length,
    total,
    pages: Math.ceil(total / limit),
    page,
    data: unprocessedOrders,
  });
});

// @desc    Get a specific unprocessed order
// @route   GET /api/unprocessed-orders/:id
// @access  Private
const getUnprocessedOrderById = asyncHandler(async (req, res) => {
  let unprocessedOrder;

  // Check if the ID is a valid MongoDB ObjectId
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    unprocessedOrder = await UnprocessedOrder.findById(req.params.id);
  }

  // If not found by _id, try to find by tempId
  if (!unprocessedOrder) {
    unprocessedOrder = await UnprocessedOrder.findOne({
      tempId: req.params.id,
    });
  }

  if (!unprocessedOrder) {
    res.status(404);
    throw new Error('Unprocessed order not found');
  }

  // Check if the user is authorized to view this order
  if (
    unprocessedOrder.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to access this order');
  }

  res.status(200).json({
    success: true,
    data: unprocessedOrder,
  });
});

// @desc    Update an unprocessed order
// @route   PUT /api/unprocessed-orders/:id
// @access  Private/Admin
const updateUnprocessedOrder = asyncHandler(async (req, res) => {
  let unprocessedOrder;

  // Check if the ID is a valid MongoDB ObjectId
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    unprocessedOrder = await UnprocessedOrder.findById(req.params.id);
  }

  // If not found by _id, try to find by tempId
  if (!unprocessedOrder) {
    unprocessedOrder = await UnprocessedOrder.findOne({
      tempId: req.params.id,
    });
  }

  if (!unprocessedOrder) {
    res.status(404);
    throw new Error('Unprocessed order not found');
  }

  // Update the order
  req.body.updatedAt = Date.now();
  const updatedOrder = await UnprocessedOrder.findByIdAndUpdate(
    unprocessedOrder._id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Unprocessed order updated successfully',
    data: updatedOrder,
  });
});

// @desc    Delete an unprocessed order
// @route   DELETE /api/unprocessed-orders/:id
// @access  Private
const deleteUnprocessedOrder = asyncHandler(async (req, res) => {
  let unprocessedOrder;

  // Check if the ID is a valid MongoDB ObjectId
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    unprocessedOrder = await UnprocessedOrder.findById(req.params.id);
  }

  // If not found by _id, try to find by tempId
  if (!unprocessedOrder) {
    unprocessedOrder = await UnprocessedOrder.findOne({
      tempId: req.params.id,
    });
  }

  if (!unprocessedOrder) {
    res.status(404);
    throw new Error('Unprocessed order not found');
  }

  // Check if the user is authorized to delete this order
  if (
    unprocessedOrder.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to delete this order');
  }

  await UnprocessedOrder.findByIdAndDelete(unprocessedOrder._id);

  res.status(200).json({
    success: true,
    message: 'Unprocessed order deleted successfully',
  });
});

// @desc    Delete all unprocessed orders for a user
// @route   DELETE /api/unprocessed-orders/user
// @access  Private
const deleteUserUnprocessedOrders = asyncHandler(async (req, res) => {
  const result = await UnprocessedOrder.deleteMany({ userId: req.user._id });

  res.status(200).json({
    success: true,
    message: `${result.deletedCount} unprocessed orders deleted successfully`,
  });
});

module.exports = {
  createUnprocessedOrder,
  getUserUnprocessedOrders,
  getAllUnprocessedOrders,
  getUnprocessedOrderById,
  updateUnprocessedOrder,
  deleteUnprocessedOrder,
  deleteUserUnprocessedOrders,
};
