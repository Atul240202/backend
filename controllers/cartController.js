const Cart = require("../models/Cart");
const Product = require("../models/Product");
const asyncHandler = require("express-async-handler");

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const userId = req.user.id;

  try {
    // Find the product
    const product = await Product.findOne({ id: productId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already has a cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create a new cart if one doesn't exist
      cart = new Cart({
        userId,
        items: [],
      });
    }

    // Check if product is already in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.productId === productId
    );

    let basePrice =
      product.sale_price || product.regular_price || product.price;
    basePrice = parseFloat(basePrice);

    if (isNaN(basePrice)) {
      return res.status(400).json({ message: "Invalid product price" });
    }

    if (itemIndex > -1) {
      // Product exists in cart, update the quantity
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Product is not in cart, add new item
      cart.items.push({
        productId,
        quantity,
        name: product.name,
        price: basePrice,
        sku: product.sku || "",
        shipping_amount: product.shipping_amount || 200,
        weight: product.weight || "",
        dimensions: {
          length: product.dimensions?.length || "",
          width: product.dimensions?.width || "",
          height: product.dimensions?.height || "",
        },
        image:
          product.images && product.images.length > 0
            ? product.images[0].src
            : "",
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { items: [] },
      });
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId === Number.parseInt(productId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
exports.removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId === Number.parseInt(productId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Remove item from cart
    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
