const Order = require('../models/Order');
const UnprocessedOrder = require('../models/UnprocessedOrder');
const { generateOrderId } = require('../utils/helpers');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    // Generate a unique order ID (e.g., ORD-YYYYMMDD-XXXX)
    const orderId = generateOrderId();

    // Create new order with the generated ID and user reference
    const order = new Order({
      ...orderData,
      order_id: orderId,
      user: req.user._id,
      order_date: new Date(),
    });

    const createdOrder = await order.save();

    // If there's an unprocessed order ID, delete it as it's now processed
    if (orderData.unprocessedOrderId) {
      await UnprocessedOrder.findByIdAndDelete(orderData.unprocessedOrderId);
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res
      .status(500)
      .json({ message: 'Failed to create order', error: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { order_id: req.params.id }],
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch order', error: error.message });
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch orders', error: error.message });
  }
};

// @desc    Get all orders (admin only)
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'id name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch orders', error: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { order_id: req.params.id }],
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res
      .status(500)
      .json({ message: 'Failed to update order status', error: error.message });
  }
};
