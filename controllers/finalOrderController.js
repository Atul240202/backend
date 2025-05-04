const FinalOrder = require("../models/FinalOrder");
const UnprocessedOrder = require("../models/UnprocessedOrder");
const shipRocketController = require("./shipRocketController");
const sendEmail = require("../utils/sendEmail");
const generateInvoiceAndUpload = require("../utils/generateInvoiceAndUpload");
const { processPhonePePayment } = require("../utils/phonepeUtils");
const Product = require("../models/Product");
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");

// @desc    Admin: Get user order stats
// @route   GET /api/admin/user-orders/:userId
// @access  Admin
exports.getUserOrderStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const orders = await FinalOrder.find({ user: userId }).sort({
    createdAt: -1,
  });

  const totalSpent = orders.reduce((sum, order) => {
    const subtotal = parseFloat(order.sub_total || 0);
    const shipping = parseFloat(order.shipping_charges || 0);
    const discount = parseFloat(order.total_discount || 0);
    return sum + (subtotal + shipping - discount);
  }, 0);

  const allProducts = orders.flatMap((o) => o.order_items);
  const productNames = [...new Set(allProducts.map((p) => p.name))];

  const orderIds = orders.map((o) => o.order_id || o._id);

  res.status(200).json({
    success: true,
    stats: {
      totalOrders: orders.length,
      totalSpent: totalSpent.toFixed(2),
      products: productNames,
      orderIds,
      orders,
    },
  });
});

// @desc    Admin: Batch api for getting user order stats
// @route   GET /api/admin/batch-user-orders
// @access  Admin
exports.getBatchUserOrderStats = asyncHandler(async (req, res) => {
  const { userIds } = req.body; // Expecting: [id1, id2, ...]

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid userIds" });
  }

  const orders = await FinalOrder.find({
    user: { $in: userIds },
  }).sort({ createdAt: -1 });

  // Group orders by userId
  const userStatsMap = {};

  for (const order of orders) {
    const userId = order.user.toString();
    if (!userStatsMap[userId]) {
      userStatsMap[userId] = {
        totalSpent: 0,
        orders: [],
        productNames: new Set(),
        orderIds: [],
      };
    }

    const subtotal = parseFloat(order.sub_total || 0);
    const shipping = parseFloat(order.shipping_charges || 0);
    const discount = parseFloat(order.total_discount || 0);
    const total = subtotal + shipping - discount;

    userStatsMap[userId].totalSpent += total;
    userStatsMap[userId].orders.push(order);
    userStatsMap[userId].orderIds.push(order.order_id || order._id);

    for (const item of order.order_items || []) {
      userStatsMap[userId].productNames.add(item.name);
    }
  }

  // Format response
  const responseData = {};
  for (const userId of userIds) {
    const stats = userStatsMap[userId] || {
      totalSpent: 0,
      orders: [],
      productNames: new Set(),
      orderIds: [],
    };

    responseData[userId] = {
      totalOrders: stats.orders.length,
      totalSpent: stats.totalSpent.toFixed(2),
      products: Array.from(stats.productNames),
      orderIds: stats.orderIds,
      orders: stats.orders,
    };
  }

  res.status(200).json({ success: true, data: responseData });
});

// @desc    Get ShipRocket order details by ID
// @route   GET /api/shiprocket/orders/:id
// @access  Private
exports.getShipRocketOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Get ShipRocket order details
    const shipRocketOrder = await shipRocketController.getShipRocketOrder(id);

    res.status(200).json({
      success: true,
      data: shipRocketOrder,
      message: "ShipRocket order details fetched successfully",
    });
  } catch (error) {
    console.error("Error getting ShipRocket order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ShipRocket order",
      error: error.message,
    });
  }
};

function buildShipRocketOrderData(orderData) {
  return {
    order_id: orderData.order_id,
    order_date: orderData.order_date,
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Home",
    channel_id: orderData.channel_id || "",
    comment: orderData.comment || "Order created via API",
    reseller_name: orderData.comment || "",
    company_name: orderData.company_name || "",
    billing_customer_name: orderData.billing_customer_name,
    billing_last_name: orderData.billing_last_name,
    billing_address: orderData.billing_address,
    billing_address_2: orderData.billing_address_2 || "",
    billing_isd_code: orderData.billing_isd_code || "91",
    billing_city: orderData.billing_city,
    billing_pincode: orderData.billing_pincode,
    billing_state: orderData.billing_state,
    billing_country: orderData.billing_country,
    billing_email: orderData.billing_email,
    billing_phone: orderData.billing_phone,
    billing_alternate_phone: orderData.billing_alternate_phone || "",
    shipping_is_billing: orderData.shipping_is_billing || true,
    shipping_customer_name: orderData.shipping_customer_name,
    shipping_last_name: orderData.shipping_last_name,
    shipping_address: orderData.shipping_address,
    shipping_address_2: orderData.shipping_address_2 || "",
    shipping_city: orderData.shipping_city,
    shipping_pincode: orderData.shipping_pincode,
    shipping_state: orderData.shipping_state,
    shipping_country: orderData.shipping_country,
    shipping_email: orderData.shipping_email,
    shipping_phone: orderData.shipping_phone,
    order_items: orderData.order_items,
    payment_method: orderData.payment_method === "COD" ? "COD" : "Prepaid",
    shipping_charges: orderData.shipping_charges || "200",
    giftwrap_charges: orderData.giftwrap_charges || "0",
    transaction_charges: orderData.transaction_charges || "0",
    total_discount: orderData.total_discount || "0",
    sub_total: orderData.sub_total,
    length: orderData.length || "10",
    breadth: orderData.breadth || "10",
    height: orderData.height || "10",
    weight: orderData.weight || "0.5",
    ewaybill_no: orderData.ewaybill_no || "",
    customer_gstin: orderData.gst_number || "",
    invoice_number: orderData.invoice_number || "",
    order_type: orderData.order_type || "ESSENTIALS",
  };
}

// For incrementing total sales by one
async function incrementProductSales(orderItems) {
  for (const item of orderItems) {
    const units = parseInt(item.units) || 1;

    const productId = item._id || item.id;

    // If productId is an ObjectId or 24-char hex, use _id
    if (
      (typeof productId === "string" && productId.length === 24) ||
      typeof productId === "object"
    ) {
      try {
        await Product.findByIdAndUpdate(
          productId,
          { $inc: { total_sales: units } },
          { new: true }
        );
      } catch (err) {
        console.warn("Failed _id update:", err.message);
      }
    }
    // If productId is a number, use custom id field
    else if (typeof productId === "number") {
      try {
        await Product.findOneAndUpdate(
          { id: productId },
          { $inc: { total_sales: units } },
          { new: true }
        );
      } catch (err) {
        console.warn("Failed numeric id update:", err.message);
      }
    } else {
      console.warn("Unrecognized product ID format:", productId);
    }
  }
}

//for creating order via phonepe payment
exports.createFinalOrderFromTransaction = async (
  orderData,
  transactionId,
  result
) => {
  console.log("🔁 createFinalOrderFromTransaction called");
  console.log("📦 orderData:", JSON.stringify(orderData, null, 2));
  console.log("🔑 transactionId:", transactionId);
  console.log("📲 result from PhonePe:", JSON.stringify(result, null, 2));

  const finalOrder = await FinalOrder.findOne({
    phonepeTransactionId: transactionId,
  });
  console.log("🔍 finalOrder found:", finalOrder);

  if (!finalOrder) {
    console.error("❌ Final order not found for transaction");
    throw new Error("Final order not found for transaction");
  }

  if (finalOrder.status === "payment confirmed") {
    console.log("✅ Final order already confirmed");
    return finalOrder;
  }

  console.log("🔄 Updating finalOrder status to 'payment confirmed'");
  finalOrder.status = "payment confirmed";
  finalOrder.phonepeApiResults = {
    success: result.success,
    statusCode: result.code,
    transactionId: result.data.transactionId,
    merchantTransactionId: result.data.merchantTransactionId,
  };

  try {
    console.log("📦 Calling handleShiprocketAndInvoice...");
    const invoiceUrl = await handleShiprocketAndInvoice(orderData, finalOrder);
    console.log("🧾 Invoice URL:", invoiceUrl);

    console.log("📈 Incrementing product sales...");
    await incrementProductSales(orderData.order_items);

    console.log("📧 Sending order confirmation email...");
    await sendOrderConfirmationMail(orderData, finalOrder, invoiceUrl);

    console.log("✅ Final order created successfully");
    return {
      success: true,
      message: "Order created successfully",
      orderId: finalOrder.order_id,
    };
  } catch (error) {
    console.error("❌ Error creating final order:", error);
    return {
      success: false,
      message: "Failed to create order",
      error: error.message,
    };
  }
};

//For creating order (courier logic is currently not in use, for making it in use kindly make ASSIGN_COURIER flag true in env)
exports.createFinalOrder = async (req, res) => {
  console.log("🔁 createFinalOrder called");

  try {
    const orderData = req.body;
    const userId = req.user.id;
    console.log("🔎 Final order dimensions before saving:", {
      length: orderData.length,
      breadth: orderData.breadth,
      height: orderData.height,
      weight: orderData.weight,
    });
    const finalOrder = await createOrderRecord(orderData, userId);

    if (orderData.payment_method === "Prepaid") {
      const transactionId = finalOrder.phonepeTransactionId;
      console.log(
        "💳 Prepaid order detected. Initiating PhonePe with transactionId:",
        transactionId
      );

      const { redirectUrl } = await processPhonePePayment(
        finalOrder,
        transactionId
      );
      console.log("🔗 redirectUrl from PhonePe:", redirectUrl);

      return res.status(202).json({
        success: true,
        message: "PhonePe payment initiated",
        redirectUrl,
        transactionId,
        orderId: finalOrder.order_id,
      });
    }

    console.log("🚚 Handling Shiprocket & Invoice for COD order...");
    const invoiceUrl = await handleShiprocketAndInvoice(orderData, finalOrder);
    console.log("🧾 Invoice URL generated:", invoiceUrl);

    console.log("📈 Incrementing product sales...");
    await incrementProductSales(orderData.order_items);

    console.log("📧 Sending order confirmation email...");
    await sendOrderConfirmationMail(orderData, finalOrder, invoiceUrl);

    console.log("✅ Final COD order processed successfully");
    return res.status(201).json({
      success: true,
      data: finalOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating final order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

async function createOrderRecord(orderData, userId) {
  orderData.user = userId;
  orderData.status = "pending";

  const finalOrder = new FinalOrder({
    ...orderData,
    shipRocketApiStatus: {
      success: false,
      statusCode: null,
      message: "ShipRocket API not triggered yet",
    },
    phonepeApiResults: {
      success: false,
      statusCode: null,
      transactionId: "",
      transactionId: "",
    },
  });

  await finalOrder.save();

  if (orderData.unprocessed_order_id) {
    await UnprocessedOrder.findOneAndDelete({
      tempId: orderData.unprocessed_order_id,
    });
  }

  if (orderData.payment_method === "Prepaid") {
    const transactionId = "TXN" + Date.now() + Math.floor(Math.random() * 1000);
    finalOrder.phonepeTransactionId = transactionId;
    await finalOrder.save();
  }

  return finalOrder;
}

async function handleShiprocketAndInvoice(orderData, finalOrder) {
  try {
    console.log("📦 Shiprocket package data:", {
      length: orderData.length,
      breadth: orderData.breadth,
      height: orderData.height,
      weight: orderData.weight,
    });
    const shipRocketOrderData = buildShipRocketOrderData(orderData);
    console.log("🛫 Final payload to ShipRocket:", shipRocketOrderData);

    const shipRocketResponse = await shipRocketController.createOrder(
      shipRocketOrderData
    );

    finalOrder.shipRocketOrderId = shipRocketResponse.order_id;
    finalOrder.shipRocketShipmentId = shipRocketResponse.shipment_id;
    finalOrder.shipRocketApiStatus = {
      success: true,
      statusCode: 200,
      message: "ShipRocket order created successfully",
    };
    await finalOrder.save();

    const invoiceUrl = await generateInvoiceAndUpload(finalOrder);
    finalOrder.invoiceUrl = invoiceUrl;
    await finalOrder.save();

    if (process.env.ASSIGN_COURIER === "true") {
      await assignPreferredCourier(finalOrder, shipRocketResponse);
    }

    return invoiceUrl;
  } catch (shipRocketError) {
    console.error("ShipRocket Error:", shipRocketError);
    const reason =
      shipRocketError?.message ||
      shipRocketError?.response?.statusText ||
      "Unknown ShipRocket failure";

    // Create unprocessed order
    await UnprocessedOrder.create({
      userId: finalOrder.user,
      products: orderData.order_items,
      shippingAddress: {
        ...orderData.shipping_address,
        phone: orderData.shipping_phone,
      },
      billingAddress: {
        ...orderData.billing_address,
        phone: orderData.billing_phone,
      },
      subtotal: orderData.sub_total,
      shipping: orderData.shipping_charges,
      total:
        parseFloat(orderData.sub_total) +
        parseFloat(orderData.shipping_charges || 0),
      reason: `ShipRocket failed: ${reason}`,
      tempId: orderData.unprocessed_order_id || Date.now().toString(),
    });

    // Remove the failed finalOrder
    await FinalOrder.findByIdAndDelete(finalOrder._id);

    throw new Error(`ShipRocket order failed: ${reason}`);
  }
}

async function sendOrderConfirmationMail(orderData, finalOrder, invoiceUrl) {
  if (!orderData.shipping_email && !orderData.billing_email) {
    throw new Error(
      "Missing recipient email address (shipping_email or billing_email)."
    );
  }

  await sendEmail({
    email: orderData.shipping_email?.trim() || orderData.billing_email?.trim(),
    subject: `Industrywaala - Order Confirmation - #${orderData.order_id}`,
    message: `
    <table style="width: 100%; font-family: Arial, sans-serif; border-collapse: collapse;">
    <tr>
    <td style="background-color: #f7f7f7; padding: 20px; text-align: center;">
    <h1 style="color: #333;">Thank you for your order!</h1>
    </td>
    </tr>
    <tr>
    <td style="padding: 20px;">
    <p style="font-size: 16px; color: #555;">Dear ${
      orderData.shipping_customer_name || orderData.billing_customer_name
    },</p>
    <p style="font-size: 16px; color: #555;">We're excited to let you know that your order #${
      orderData.order_id
    } has been successfully placed and is now being processed.</p>
    <h2 style="color: #333; margin-top: 30px;">Order Details:</h2>
    <p style="font-size: 16px; color: #555;"><strong>Order ID:</strong> ${
      orderData.order_id
    }</p>
    <p style="font-size: 16px; color: #555;"><strong>Order Date:</strong> ${new Date(
      orderData.order_date
    ).toLocaleDateString()}</p>
    <h3 style="color: #333; margin-top: 20px;">Shipping Address:</h3>
    <p style="font-size: 16px; color: #555;">
    ${orderData.shipping_customer_name} ${orderData.shipping_last_name}<br>
    ${orderData.shipping_address}<br>
    ${orderData.shipping_address_2 ? orderData.shipping_address_2 + "<br>" : ""}
    ${orderData.shipping_city}, ${orderData.shipping_state} ${
      orderData.shipping_pincode
    }<br>
    ${orderData.shipping_country}
    </p>
    <h3 style="color: #333; margin-top: 20px;">Billing Address:</h3>
    <p style="font-size: 16px; color: #555;">
    ${orderData.billing_customer_name} ${orderData.billing_last_name}<br>
    ${orderData.billing_address}<br>
    ${orderData.billing_address_2 ? orderData.billing_address_2 + "<br>" : ""}
    ${orderData.billing_city}, ${orderData.billing_state} ${
      orderData.billing_pincode
    }<br>
    ${orderData.billing_country}
    </p>
    <h3 style="color: #333; margin-top: 20px;">Items in your order:</h3>
    <ul style="list-style: none; padding: 0;">
    ${orderData.order_items
      .map(
        (item) => `
    <li style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
    <strong>${item.name}</strong> x ${item.units}
    <span style="float: right;">₹${item.selling_price * item.units}</span>
     </li>
    `
      )
      .join("")}
    </ul>
    <p style="font-size: 16px; color: #555;"><strong>Subtotal:</strong> <span style="float: right;">₹${
      orderData.sub_total
    }</span></p>
    ${
      orderData.total_discount && parseFloat(orderData.total_discount) > 0
        ? `<p style="font-size: 16px; color: #555;"><strong>Discount:</strong> <span style="float: right;">-₹${parseFloat(
            orderData.total_discount
          )}</span></p>`
        : ""
    }
    ${
      orderData.shipping_charges && parseFloat(orderData.shipping_charges) > 0
        ? `<p style="font-size: 16px; color: #555;"><strong>Shipping Charges:</strong> <span style="float: right;">₹${parseFloat(
            orderData.shipping_charges
          )}</span></p>`
        : `<p style="font-size: 16px; color: #555;"><strong>Shipping Charges:</strong> <span style="float: right;">Free</span></p>`
    }
    ${
      orderData.transaction_charges &&
      parseFloat(orderData.transaction_charges) > 0
        ? `<p style="font-size: 16px; color: #555;"><strong>Transaction Charges:</strong> <span style="float: right;">₹${parseFloat(
            orderData.transaction_charges
          )}</span></p>`
        : ""
    }
    <p style="font-size: 18px; color: #333; font-weight: bold;">Order Total: <span style="float: right;">₹${
      parseFloat(orderData.sub_total) +
      (parseFloat(orderData.shipping_charges) || 0) +
      (parseFloat(orderData.transaction_charges) || 0) -
      (parseFloat(orderData.total_discount) || 0)
    }</span></p>
    <p style="font-size: 16px; color: #555; margin-top: 30px;">You can download your invoice here: <a href="${invoiceUrl}" style="color: #007bff; text-decoration: none;">View Invoice</a></p>
    <p style="font-size: 16px; color: #555;"><strong>You can stay updated about your order from the Order section on your account page.</strong></p>
    <p style="font-size: 16px; color: #555; margin-top: 30px;">Thank you again for choosing Industrywaala!</p>
     <p style="font-size: 16px; color: #555;">Sincerely,<br>The Industrywaala Team</p>
     </td>
    </tr>
    <tr>
     <td style="background-color: #f7f7f7; padding: 10px; text-align: center; font-size: 12px; color: #777;">
    This is an automatically generated email. Please do not reply to this message.
    </td>
    </tr>
    </table>
    `,
  });
}

// exports.verifyPhonePePayment = async (req, res) => {
//   try {
//     const { transactionId } = req.params;
//     const finalOrder = await FinalOrder.findOne({
//       phonepeTransactionId: transactionId,
//     });

//     if (!finalOrder) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found" });
//     }

//     const accessToken =
//       await require("../utils/phonepeUtils").getPhonePeAccessToken();

//     const response = await fetch(
//       `${process.env.PHONEPE_API_URL}/pg-sandbox/checkout/v1/status/${transactionId}?merchantId=${process.env.PHONEPE_MERCHANT_ID}`,
//       {
//         method: "GET",
//         headers: {
//           Authorization: `O-Bearer ${accessToken}`,
//           accept: "application/json",
//         },
//       }
//     );

//     const result = await response.json();
//     const status =
//       result?.success && result?.code === "PAYMENT_SUCCESS"
//         ? "COMPLETED"
//         : result?.code;

//     if (status === "COMPLETED") {
//       finalOrder.status = "payment confirmed";
//       await finalizeOrderSteps(finalOrder);
//       return res.status(200).json({
//         success: true,
//         status: "success",
//         orderId: finalOrder.order_id,
//       });
//     } else {
//       finalOrder.status = "cancelled";
//       await finalOrder.save();
//       return res.status(400).json({
//         success: false,
//         status: "failed",
//         message: result.message || "Payment failed",
//       });
//     }
//   } catch (err) {
//     console.error("PhonePe verification error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Error verifying payment",
//       error: err.message,
//     });
//   }
// };

//Order creation process done

// Get all final orders (admin only)
exports.getAllFinalOrders = async (req, res) => {
  try {
    const finalOrders = await FinalOrder.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: finalOrders.length,
      data: finalOrders,
    });
  } catch (error) {
    console.error("Error fetching final orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Get current user's final orders
exports.getMyFinalOrders = async (req, res) => {
  try {
    const finalOrders = await FinalOrder.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: finalOrders.length,
      data: finalOrders,
    });
  } catch (error) {
    console.error("Error fetching user final orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your orders",
      error: error.message,
    });
  }
};

// Get a specific final order by ID
exports.getFinalOrderById = async (req, res) => {
  try {
    const finalOrder = await FinalOrder.findById(req.params.id);

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if the order belongs to the current user or if the user is an admin
    if (
      finalOrder.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this order",
      });
    }

    res.status(200).json({
      success: true,
      data: finalOrder,
    });
  } catch (error) {
    console.error("Error fetching final order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// Update a final order status (admin only)
exports.updateFinalOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const finalOrder = await FinalOrder.findById(req.params.id);

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    finalOrder.status = status;
    await finalOrder.save();

    res.status(200).json({
      success: true,
      data: finalOrder,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating final order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

// Delete a final order (admin only)
exports.deleteFinalOrder = async (req, res) => {
  try {
    const finalOrder = await FinalOrder.findById(req.params.id);

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await FinalOrder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting final order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};

// Retry ShipRocket integration for a failed order (admin only)
exports.retryShipRocketIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    const finalOrder = await FinalOrder.findById(id);

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Format order data for ShipRocket
    const shipRocketOrderData = {
      order_id: finalOrder.order_id,
      order_date: finalOrder.order_date,
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Home",
      channel_id: finalOrder.channel_id || "",
      comment: finalOrder.comment || "Order created via API",
      reseller_name: finalOrder.comment || "",
      company_name: finalOrder.company_name || "",

      billing_customer_name: finalOrder.billing_customer_name,
      billing_last_name: finalOrder.billing_last_name,
      billing_address: finalOrder.billing_address,
      billing_address_2: finalOrder.billing_address_2 || "",
      billing_isd_code: finalOrder.billing_isd_code || "91",
      billing_city: finalOrder.billing_city,
      billing_pincode: finalOrder.billing_pincode,
      billing_state: finalOrder.billing_state,
      billing_country: finalOrder.billing_country,
      billing_email: finalOrder.billing_email,
      billing_phone: finalOrder.billing_phone,
      billing_alternate_phone: finalOrder.billing_alternate_phone || "",
      shipping_is_billing: finalOrder.shipping_is_billing || true,
      shipping_customer_name: finalOrder.shipping_customer_name,
      shipping_last_name: finalOrder.shipping_last_name,
      shipping_address: finalOrder.shipping_address,
      shipping_address_2: finalOrder.shipping_address_2 || "",
      shipping_city: finalOrder.shipping_city,
      shipping_pincode: finalOrder.shipping_pincode,
      shipping_state: finalOrder.shipping_state,
      shipping_country: finalOrder.shipping_country,
      shipping_email: finalOrder.shipping_email,
      shipping_phone: finalOrder.shipping_phone,
      order_items: finalOrder.order_items,
      payment_method: finalOrder.payment_method === "COD" ? "COD" : "Prepaid",
      shipping_charges: finalOrder.shipping_charges || "200",
      giftwrap_charges: finalOrder.giftwrap_charges || "0",
      transaction_charges: finalOrder.transaction_charges || "0",
      total_discount: finalOrder.total_discount || "0",
      sub_total: finalOrder.sub_total,
      length: finalOrder.length || "10",
      breadth: finalOrder.breadth || "10",
      height: finalOrder.height || "10",
      weight: finalOrder.weight || "0.5",
      ewaybill_no: finalOrder.ewaybill_no || "",
      customer_gstin: finalOrder.gst_number || "",
      invoice_number: finalOrder.invoice_number || "",
      order_type: finalOrder.order_type || "ESSENTIALS",
    };

    // Create ShipRocket order
    const shipRocketResponse = await shipRocketController.createOrder(
      shipRocketOrderData
    );

    // Update order with ShipRocket data
    finalOrder.shipRocketOrderId = shipRocketResponse.order_id;
    finalOrder.shipRocketShipmentId = shipRocketResponse.shipment_id;

    // Save updated order
    await finalOrder.save();

    // Get available couriers for automatic selection
    // const availableCouriers = await shipRocketController.getAvailableCouriers(
    //   process.env.SHIPROCKET_PICKUP_PINCODE || "110001",
    //   finalOrder.shipping_pincode,
    //   finalOrder.weight || "0.5",
    //   finalOrder.payment_method === "COD"
    // );

    // Select the first available courier
    // if (
    //   availableCouriers &&
    //   availableCouriers.data &&
    //   availableCouriers.data.available_courier_companies &&
    //   availableCouriers.data.available_courier_companies.length > 0
    // ) {
    //   const selectedCourier =
    //     availableCouriers.data.available_courier_companies[0];

    //   // Assign AWB
    //   const awbResponse = await shipRocketController.assignAWB(
    //     shipRocketResponse.shipment_id,
    //     selectedCourier.courier_company_id
    //   );

    //   // Update order with AWB and courier details
    //   finalOrder.awbCode = awbResponse.awb_code;
    //   finalOrder.courierId = selectedCourier.courier_company_id;
    //   finalOrder.courierName = selectedCourier.courier_name;
    //   finalOrder.trackingUrl = awbResponse.tracking_url || "";
    //   finalOrder.shipmentStatus = "AWB_ASSIGNED";

    //   // Save updated order
    //   await finalOrder.save();
    // }

    res.status(200).json({
      success: true,
      data: finalOrder,
      message: "ShipRocket integration retried successfully",
    });
  } catch (error) {
    console.error("Error retrying ShipRocket integration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retry ShipRocket integration",
      error: error.message,
    });
  }
};

// Track shipment
exports.trackShipment = async (req, res) => {
  try {
    const { id } = req.params;

    const finalOrder = await FinalOrder.findOne({ order_id: id });

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const trackingData = await shipRocketController.trackShipment(
      finalOrder.order_id
    );

    res.status(200).json({
      success: true,
      data: trackingData,
    });
  } catch (error) {
    console.error("Error tracking shipment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track shipment",
      error: error.message,
    });
  }
};

exports.assignCourierToOrder = async (req, res) => {
  try {
    const { id } = req.params; // FinalOrder ID
    const finalOrder = await FinalOrder.findById(id);

    if (!finalOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (
      finalOrder.status === "cancelled" ||
      finalOrder.status === "delivered" ||
      finalOrder.shipmentStatus === "shipped" ||
      finalOrder.shipmentStatus === "AWB_ASSIGNED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Order already shipped, cancelled, or AWB assigned",
      });
    }

    const shipmentId = finalOrder.shipRocketShipmentId;
    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        message: "Missing ShipRocket shipment ID",
      });
    }

    // Call ShipRocket to assign AWB (courier)
    const awbResponse = await shipRocketController.assignAWB(shipmentId);

    // Update finalOrder with courier details
    finalOrder.status = "shipped";
    finalOrder.awbCode = awbResponse.awb_code;
    finalOrder.courierId = awbResponse.courier_id;
    finalOrder.trackingUrl = awbResponse.tracking_url;
    finalOrder.shipmentStatus = "AWB_ASSIGNED";
    await finalOrder.save();

    res.status(200).json({
      success: true,
      message: "Courier assigned and AWB generated successfully",
      data: finalOrder,
    });
  } catch (error) {
    console.error("Error assigning courier:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign courier",
      error: error.message,
    });
  }
};

async function assignPreferredCourier(finalOrder, shipRocketResponse) {
  try {
    const courierList = shipRocketResponse?.available_courier_companies || [];

    const preferredCourier = courierList.find(
      (courier) =>
        courier.courier_name === "Delhivery" && courier.etd === "1-2 Days"
    );

    if (preferredCourier) {
      finalOrder.shipRocketCourierId = preferredCourier.courier_company_id;
      finalOrder.shipRocketCourierName = preferredCourier.courier_name;
      finalOrder.shipRocketCourierETD = preferredCourier.etd;
      finalOrder.shipRocketCourierStatus = "ASSIGNED";
    } else {
      finalOrder.shipRocketCourierStatus = "NOT_ASSIGNED";
    }

    await finalOrder.save();
  } catch (error) {
    console.error("Error assigning preferred courier:", error.message);
    finalOrder.shipRocketCourierStatus = "ASSIGNMENT_FAILED";
    await finalOrder.save();
  }
}

exports.getInvoiceByOrderId = async (req, res) => {
  try {
    const { order_id } = req.params;
    const finalOrder = await FinalOrder.findOne({ order_id });

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Final order not found",
      });
    }

    const isUserRoute = req.originalUrl.includes("/user/invoice");

    if (isUserRoute && finalOrder.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this invoice",
      });
    }

    if (!finalOrder.invoiceUrl) {
      return res.status(404).json({
        success: false,
        message: "Invoice not available for this order",
      });
    }

    return res.status(200).json({
      success: true,
      invoiceUrl: finalOrder.invoiceUrl,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error fetching invoice",
      error: err.message,
    });
  }
};

exports.cancelFinalOrderWithRefund = async (req, res) => {
  try {
    const { ids: order_id } = req.body;
    const finalOrder = await FinalOrder.findOne({
      shipRocketOrderId: order_id,
    });
    if (!finalOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (finalOrder.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Order already cancelled" });
    }

    // Step 1: Cancel on ShipRocket
    let cancelResult;
    if (finalOrder.awbCode) {
      cancelResult = await shipRocketController.cancelShipments([
        finalOrder.awbCode,
      ]);
    } else {
      cancelResult = await shipRocketController.cancelOrderByOrderId([
        finalOrder.shipRocketOrderId,
      ]);
    }

    if (!cancelResult || cancelResult.status_code !== 200) {
      return res
        .status(422)
        .json({ success: false, message: "ShipRocket cancellation failed" });
    }

    // Step 2: Process refund if payment was via PhonePe
    if (
      finalOrder.payment_method === "Prepaid" &&
      finalOrder.phonepeTransactionId
    ) {
      const refundResponse = await processPhonePeRefund(
        finalOrder.phonepeTransactionId
      );
      finalOrder.refund_response = refundResponse;
      finalOrder.refund_status = refundResponse.success ? "success" : "failed";
      await finalOrder.save();

      if (refundResponse.success) {
        return res.status(200).json({
          success: true,
          message: "Order cancelled and refund processed",
        });
      } else {
        return res.status(200).json({
          success: true,
          message:
            "Order cancelled but refund failed. Please connect to admins via Contact form",
        });
      }
    }

    // Step 3: Update order status locally
    finalOrder.status = "cancelled";
    await finalOrder.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel & Refund Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

async function processPhonePeRefund(transactionId) {
  try {
    const order = await FinalOrder.findOne({
      phonepeTransactionId: transactionId,
    });

    if (!order) throw new Error("Order not found for refund");

    const refundAmount =
      parseFloat(order.sub_total || 0) +
      parseFloat(order.shipping_charges || 0);

    const refundPayload = {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      originalTransactionId: transactionId,
      merchantUserId: order.user.toString(),
      merchantTransactionId: "REF" + Date.now() + transactionId,
      amount: Math.round(refundAmount * 100), // in paise
      callbackUrl: "", // optional
      message: "User requested cancellation refund",
    };

    const payloadBase64 = Buffer.from(JSON.stringify(refundPayload)).toString(
      "base64"
    );

    const rawSignature =
      payloadBase64 + "/pg/v1/refund" + process.env.PHONEPE_SALT_KEY;
    const sha256 = crypto
      .createHash("sha256")
      .update(rawSignature)
      .digest("hex");
    const xVerify = sha256 + "###" + process.env.PHONEPE_SALT_INDEX;

    const response = await fetch(`${process.env.PHONEPE_API_URL}/v1/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });
    const result = await response.json();

    if (result.success && result.code === "REFUND_INITIATED") {
      return { success: true, message: "Refund initiated", data: result };
    } else {
      console.error("Refund failed:", result);
      return {
        success: false,
        message: result.message || "Refund failed",
        data: result,
      };
    }
  } catch (error) {
    console.error("Refund error:", error.message);
    return { success: false, message: error.message };
  }
}

// Route: POST /admin/retry-refund
exports.retryRefund = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await FinalOrder.findOne({ order_id: orderId });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (order.refund_status === "success") {
      return res
        .status(400)
        .json({ success: false, message: "Refund already processed" });
    }

    if (order.payment_method !== "Prepaid" || !order.phonepeTransactionId) {
      return res.status(400).json({
        success: false,
        message: "Refund not applicable for this order",
      });
    }

    const refundResponse = await processPhonePeRefund(
      order.phonepeTransactionId
    );

    order.refund_response = refundResponse;
    order.refund_status = refundResponse.success ? "success" : "failed";
    await order.save();

    return res.status(200).json({
      success: refundResponse.success,
      message: refundResponse.success
        ? "Refund re-processed successfully"
        : "Refund retry failed",
      data: refundResponse,
    });
  } catch (err) {
    console.error("Retry Refund Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all payment records from Final Orders
// @route   GET /api/final-orders/payments
// @access  Admin
exports.getAllPayments = asyncHandler(async (req, res) => {
  const orders = await FinalOrder.find({})
    .sort({ createdAt: -1 })
    .populate("user", "name email") // optional: populate user info
    .select(
      "order_id payment_method sub_total shipping_charges transaction_charges status order_date phonepeTransactionId createdAt"
    );

  const payments = orders.map((order) => ({
    order_id: order.order_id,
    user: order.user,
    payment_method: order.payment_method,
    amount: Number(order.sub_total) + Number(order.shipping_charges),
    transaction_charges: order.transaction_charges,
    status: order.status,
    payment_gateway_txn_id: order.phonepeTransactionId || "N/A",
    date: order.createdAt,
  }));

  res.json({ success: true, data: payments });
});
