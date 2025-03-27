const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const asyncHandler = require('express-async-handler');

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
exports.addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  try {
    // Find the product
    const product = await Product.findOne({ id: productId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already has a wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Create a new wishlist if one doesn't exist
      wishlist = new Wishlist({
        userId,
        items: [],
      });
    }

    // Check if product is already in wishlist
    const itemIndex = wishlist.items.findIndex(
      (item) => item.productId === productId
    );

    if (itemIndex > -1) {
      // Product already exists in wishlist
      return res.status(200).json({
        success: true,
        message: 'Product already in wishlist',
        wishlist,
      });
    } else {
      // Product is not in wishlist, add new item
      wishlist.items.push({
        productId,
        name: product.name,
        price: Number.parseFloat(product.price),
        image:
          product.images && product.images.length > 0
            ? product.images[0].src
            : '',
        stock_status: product.stock_status || 'instock',
      });
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist,
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        wishlist: { items: [] },
      });
    }

    // Update stock status for each item in wishlist
    for (const item of wishlist.items) {
      const product = await Product.findOne({ id: item.productId });
      if (product) {
        item.stock_status = product.stock_status || 'instock';
      }
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const itemIndex = wishlist.items.findIndex(
      (item) => item.productId === Number.parseInt(productId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    // Remove item from wishlist
    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from wishlist',
      wishlist,
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Clear wishlist
// @route   DELETE /api/wishlist
// @access  Private
exports.clearWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.items = [];
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
exports.checkWishlistItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        isInWishlist: false,
      });
    }

    const isInWishlist = wishlist.items.some(
      (item) => item.productId === Number.parseInt(productId)
    );

    res.status(200).json({
      success: true,
      isInWishlist,
    });
  } catch (error) {
    console.error('Check wishlist item error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
