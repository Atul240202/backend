const FinalOrder = require("../models/FinalOrder");
const UnprocessedOrder = require("../models/UnprocessedOrder");
const shipRocketController = require("./shipRocketController");
const sendEmail = require("../utils/sendEmail");
const generateInvoiceAndUpload = require("../utils/generateInvoiceAndUpload");
const { processPhonePePayment } = require("../utils/phonepeUtils");

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

//for creating order via phonepe payment
exports.createFinalOrderFromTransaction = async (
  orderData,
  transactionId,
  result
) => {
  const finalOrder = await FinalOrder.findOne({
    phonepeTransactionId: transactionId,
  });
  if (!finalOrder) throw new Error("Final order not found for transaction");
  if (finalOrder.status === "payment confirmed") {
    return finalOrder;
  }

  finalOrder.status = "payment confirmed";
  finalOrder.phonepeApiResults = {
    success: result.success,
    statusCode: result.code,
    transactionId: result.data.transactionId,
    merchantTransactionId: result.data.merchantTransactionId,
  };
  try {
    const invoiceUrl = await handleShiprocketAndInvoice(orderData, finalOrder);
    await sendOrderConfirmationMail(orderData, finalOrder, invoiceUrl);
    return {
      success: true,
      message: "Order created successfully",
      orderId: finalOrder.order_id,
    };
  } catch (error) {
    console.error("Error creating final order:", error);
    return {
      success: false,
      message: "Failed to create order",
      error: error.message,
    };
  }
};

//For creating order (courier logic is currently not in use, for making it in use kindly make ASSIGN_COURIER flag true in env)
exports.createFinalOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const userId = req.user.id;

    const finalOrder = await createOrderRecord(orderData, userId);

    if (orderData.payment_method === "Prepaid") {
      const transactionId = finalOrder.phonepeTransactionId;
      const { redirectUrl } = await processPhonePePayment(
        finalOrder,
        transactionId
      );

      return res.status(202).json({
        success: true,
        message: "PhonePe payment initiated",
        redirectUrl,
        transactionId,
        orderId: finalOrder.order_id,
      });
    }

    const invoiceUrl = await handleShiprocketAndInvoice(orderData, finalOrder);
    await sendOrderConfirmationMail(orderData, finalOrder, invoiceUrl);

    return res.status(201).json({
      success: true,
      data: finalOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating final order:", error);
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
    const shipRocketOrderData = buildShipRocketOrderData(orderData);

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

    // Optionally handle commented courier logic here if needed in future
    if (process.env.ASSIGN_COURIER === "true") {
      await assignPreferredCourier(finalOrder, shipRocketResponse);
    }

    return invoiceUrl;
  } catch (shipRocketError) {
    console.error("Error processing ShipRocket integration:", shipRocketError);
    finalOrder.shipRocketApiStatus = {
      success: false,
      statusCode: shipRocketError.response?.status || 500,
      message: shipRocketError.message || "Failed to create ShipRocket order",
    };
    await finalOrder.save();
    return null;
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

exports.verifyPhonePePayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const finalOrder = await FinalOrder.findOne({
      phonepeTransactionId: transactionId,
    });

    if (!finalOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const accessToken =
      await require("../utils/phonepeUtils").getPhonePeAccessToken();

    const response = await fetch(
      `${process.env.PHONEPE_API_URL}/pg-sandbox/checkout/v1/status/${transactionId}?merchantId=${process.env.PHONEPE_CLIENT_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `O-Bearer ${accessToken}`,
          accept: "application/json",
        },
      }
    );

    const result = await response.json();
    const status =
      result?.success && result?.code === "PAYMENT_SUCCESS"
        ? "COMPLETED"
        : result?.code;

    if (status === "COMPLETED") {
      finalOrder.status = "payment confirmed";
      await finalizeOrderSteps(finalOrder);
      return res.status(200).json({
        success: true,
        status: "success",
        orderId: finalOrder.order_id,
      });
    } else {
      finalOrder.status = "cancelled";
      await finalOrder.save();
      return res.status(400).json({
        success: false,
        status: "failed",
        message: result.message || "Payment failed",
      });
    }
  } catch (err) {
    console.error("PhonePe verification error:", err);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: err.message,
    });
  }
};

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

    await finalOrder.remove();

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

    const finalOrder = await FinalOrder.findById(id);

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!finalOrder.awbCode) {
      return res.status(400).json({
        success: false,
        message: "No AWB code available for tracking",
      });
    }

    const trackingData = await shipRocketController.trackShipment(
      finalOrder.awbCode
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

// Create a new final order (Not in use but kept for if something goes wrong with the updated one)
// exports.createFinalOrder = async (req, res) => {
//   try {
//     const orderData = req.body;

//     // Add user reference to the order
//     orderData.user = req.user.id;
//     orderData.status = "pending";
//     // Create the final order
//     const finalOrder = new FinalOrder({
//       ...orderData,
//       shipRocketApiStatus: {
//         success: false,
//         statusCode: null,
//         message: "ShipRocket API not triggered yet",
//       },
//     });

//     await finalOrder.save();

//     // If there's an unprocessed order ID, delete it
//     if (orderData.unprocessed_order_id) {
//       await UnprocessedOrder.findOneAndDelete({
//         tempId: orderData.unprocessed_order_id,
//       });
//     }

//     if (orderData.payment_method === "PhonePe") {
//       const transactionId =
//         "TXN" + Date.now() + Math.floor(Math.random() * 1000);
//       finalOrder.phonepeTransactionId = transactionId;
//       await finalOrder.save();

//       const { redirectUrl } = await processPhonePePayment(
//         finalOrder,
//         transactionId
//       );

//       return res.status(202).json({
//         success: true,
//         message: "PhonePe payment initiated",
//         redirectUrl,
//         transactionId,
//         orderId: finalOrder.order_id,
//       });
//     }

//     // Create order in ShipRocket
//     try {
//       // Format order data for ShipRocket
//       const shipRocketOrderData = {
//         order_id: orderData.order_id,
//         order_date: orderData.order_date,
//         pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Home",
//         channel_id: orderData.channel_id || "",
//         comment: orderData.comment || "Order created via API",
//         reseller_name: orderData.comment || "",
//         company_name: orderData.company_name || "",
//         // gst_number: orderData.gst_number || "",
//         billing_customer_name: orderData.billing_customer_name,
//         billing_last_name: orderData.billing_last_name,
//         billing_address: orderData.billing_address,
//         billing_address_2: orderData.billing_address_2 || "",
//         billing_isd_code: orderData.billing_isd_code || "91",
//         billing_city: orderData.billing_city,
//         billing_pincode: orderData.billing_pincode,
//         billing_state: orderData.billing_state,
//         billing_country: orderData.billing_country,
//         billing_email: orderData.billing_email,
//         billing_phone: orderData.billing_phone,
//         billing_alternate_phone: orderData.billing_alternate_phone || "",
//         shipping_is_billing: orderData.shipping_is_billing || true,
//         shipping_customer_name: orderData.shipping_customer_name,
//         shipping_last_name: orderData.shipping_last_name,
//         shipping_address: orderData.shipping_address,
//         shipping_address_2: orderData.shipping_address_2 || "",
//         shipping_city: orderData.shipping_city,
//         shipping_pincode: orderData.shipping_pincode,
//         shipping_state: orderData.shipping_state,
//         shipping_country: orderData.shipping_country,
//         shipping_email: orderData.shipping_email,
//         shipping_phone: orderData.shipping_phone,
//         order_items: orderData.order_items,
//         payment_method:
//           orderData.payment_method === "COD" ? "COD" : "Prepaid",
//         shipping_charges: orderData.shipping_charges || "200",
//         giftwrap_charges: orderData.giftwrap_charges || "0",
//         transaction_charges: orderData.transaction_charges || "0",
//         total_discount: orderData.total_discount || "0",
//         sub_total: (
//           Number(orderData.sub_total) + Number(orderData.shipping_charges)
//         ).toString(),
//         length: orderData.length || "10",
//         breadth: orderData.breadth || "10",
//         height: orderData.height || "10",
//         weight: orderData.weight || "0.5",
//         ewaybill_no: orderData.ewaybill_no || "",
//         customer_gstin: orderData.gst_number || "",
//         invoice_number: orderData.invoice_number || "",
//         order_type: orderData.order_type || "ESSENTIALS",
//       };

//       // Create ShipRocket order
//       shipRocketResponse = await shipRocketController.createOrder(
//         shipRocketOrderData
//       );
//       // Update order with ShipRocket data
//       finalOrder.shipRocketOrderId = shipRocketResponse.order_id;
//       finalOrder.shipRocketShipmentId = shipRocketResponse.shipment_id;
//       // Update ShipRocket API status to success
//       finalOrder.shipRocketApiStatus = {
//         success: true,
//         statusCode: 200,
//         message: "ShipRocket order created successfully",
//       };

//       // Save updated order
//       await finalOrder.save();
//       // Generate invoice
//       const invoiceUrl = await generateInvoiceAndUpload(finalOrder);
//       finalOrder.invoiceUrl = invoiceUrl;
//       await finalOrder.save();

//       if (!orderData.shipping_email) {
//         throw new Error("Missing recipient email address (shipping_email).");
//       }

//       await sendEmail({
//         email:
//           orderData.shipping_email?.trim() || orderData.billing_email?.trim(),
//         subject: `Industrywaala - Order Confirmation - #${orderData.order_id}`,
//         message: `
//         <table style="width: 100%; font-family: Arial, sans-serif; border-collapse: collapse;">
//         <tr>
//         <td style="background-color: #f7f7f7; padding: 20px; text-align: center;">
//         <h1 style="color: #333;">Thank you for your order!</h1>
//         </td>
//         </tr>
//         <tr>
//         <td style="padding: 20px;">
//         <p style="font-size: 16px; color: #555;">Dear ${
//           orderData.shipping_customer_name || orderData.billing_customer_name
//         },</p>
//         <p style="font-size: 16px; color: #555;">We're excited to let you know that your order #${
//           orderData.order_id
//         } has been successfully placed and is now being processed.</p>
//         <h2 style="color: #333; margin-top: 30px;">Order Details:</h2>
//         <p style="font-size: 16px; color: #555;"><strong>Order ID:</strong> ${
//           orderData.order_id
//         }</p>
//         <p style="font-size: 16px; color: #555;"><strong>Order Date:</strong> ${new Date(
//           orderData.order_date
//         ).toLocaleDateString()}</p>
//         <h3 style="color: #333; margin-top: 20px;">Shipping Address:</h3>
//         <p style="font-size: 16px; color: #555;">
//         ${orderData.shipping_customer_name} ${orderData.shipping_last_name}<br>
//         ${orderData.shipping_address}<br>
//         ${
//           orderData.shipping_address_2
//             ? orderData.shipping_address_2 + "<br>"
//             : ""
//         }
//         ${orderData.shipping_city}, ${orderData.shipping_state} ${
//           orderData.shipping_pincode
//         }<br>
//         ${orderData.shipping_country}
//         </p>
//         <h3 style="color: #333; margin-top: 20px;">Billing Address:</h3>
//         <p style="font-size: 16px; color: #555;">
//         ${orderData.billing_customer_name} ${orderData.billing_last_name}<br>
//         ${orderData.billing_address}<br>
//         ${
//           orderData.billing_address_2
//             ? orderData.billing_address_2 + "<br>"
//             : ""
//         }
//         ${orderData.billing_city}, ${orderData.billing_state} ${
//           orderData.billing_pincode
//         }<br>
//         ${orderData.billing_country}
//         </p>
//         <h3 style="color: #333; margin-top: 20px;">Items in your order:</h3>
//         <ul style="list-style: none; padding: 0;">
//         ${orderData.order_items
//           .map(
//             (item) => `
//         <li style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
//         <strong>${item.name}</strong> x ${item.units}
//         <span style="float: right;">₹${item.selling_price * item.units}</span>
//          </li>
//         `
//           )
//           .join("")}
//         </ul>
//         <p style="font-size: 16px; color: #555;"><strong>Subtotal:</strong> <span style="float: right;">₹${
//           orderData.sub_total
//         }</span></p>
//         ${
//           orderData.total_discount && parseFloat(orderData.total_discount) > 0
//             ? `<p style="font-size: 16px; color: #555;"><strong>Discount:</strong> <span style="float: right;">-₹${parseFloat(
//                 orderData.total_discount
//               )}</span></p>`
//             : ""
//         }
//         ${
//           orderData.shipping_charges &&
//           parseFloat(orderData.shipping_charges) > 0
//             ? `<p style="font-size: 16px; color: #555;"><strong>Shipping Charges:</strong> <span style="float: right;">₹${parseFloat(
//                 orderData.shipping_charges
//               )}</span></p>`
//             : `<p style="font-size: 16px; color: #555;"><strong>Shipping Charges:</strong> <span style="float: right;">Free</span></p>`
//         }
//         ${
//           orderData.transaction_charges &&
//           parseFloat(orderData.transaction_charges) > 0
//             ? `<p style="font-size: 16px; color: #555;"><strong>Transaction Charges:</strong> <span style="float: right;">₹${parseFloat(
//                 orderData.transaction_charges
//               )}</span></p>`
//             : ""
//         }
//         <p style="font-size: 18px; color: #333; font-weight: bold;">Order Total: <span style="float: right;">₹${
//           parseFloat(orderData.sub_total) +
//           (parseFloat(orderData.shipping_charges) || 0) +
//           (parseFloat(orderData.transaction_charges) || 0) -
//           (parseFloat(orderData.total_discount) || 0)
//         }</span></p>
//         <p style="font-size: 16px; color: #555; margin-top: 30px;">You can download your invoice here: <a href="${invoiceUrl}" style="color: #007bff; text-decoration: none;">View Invoice</a></p>
//         <p style="font-size: 16px; color: #555;"><strong>You can stay updated about your order from the Order section on your account page.</strong></p>
//         <p style="font-size: 16px; color: #555; margin-top: 30px;">Thank you again for choosing Industrywaala!</p>
//          <p style="font-size: 16px; color: #555;">Sincerely,<br>The Industrywaala Team</p>
//          </td>
//         </tr>
//         <tr>
//          <td style="background-color: #f7f7f7; padding: 10px; text-align: center; font-size: 12px; color: #777;">
//         This is an automatically generated email. Please do not reply to this message.
//         </td>
//         </tr>
//         </table>
//         `,
//       });
//       // // Get available couriers for automatic selection
//       // const availableCouriers = await shipRocketController.getAvailableCouriers(
//       //   process.env.SHIPROCKET_PICKUP_PINCODE || '110001', // Default or configured pickup pincode
//       //   orderData.shipping_pincode,
//       //   orderData.weight || '0.5',
//       //   orderData.payment_method === 'COD'
//       // );

//       // // Select the first available courier
//       // if (
//       //   availableCouriers &&
//       //   availableCouriers.data &&
//       //   availableCouriers.data.available_courier_companies &&
//       //   availableCouriers.data.available_courier_companies.length > 0
//       // ) {
//       //   const selectedCourier =
//       //     availableCouriers.data.available_courier_companies[0];

//       //   // Assign AWB
//       //   const awbResponse = await shipRocketController.assignAWB(
//       //     shipRocketResponse.shipment_id,
//       //     selectedCourier.courier_company_id
//       //   );

//       //   // Update order with AWB and courier details
//       //   finalOrder.awbCode = awbResponse.awb_code;
//       //   finalOrder.courierId = selectedCourier.courier_company_id;
//       //   finalOrder.courierName = selectedCourier.courier_name;
//       //   finalOrder.trackingUrl = awbResponse.tracking_url || '';
//       //   finalOrder.shipmentStatus = 'AWB_ASSIGNED';

//       //   // Save updated order
//       //   await finalOrder.save();
//       // }
//     } catch (shipRocketError) {
//       console.error(
//         "Error processing ShipRocket integration:",
//         shipRocketError
//       );
//       // Continue with order creation even if ShipRocket fails
//       // Update ShipRocket API status to failure
//       finalOrder.shipRocketApiStatus = {
//         success: false,
//         statusCode: shipRocketError.response?.status || 500,
//         message: shipRocketError.message || "Failed to create ShipRocket order",
//       };

//       // Save updated order with error status
//       await finalOrder.save();
//     }

//     res.status(201).json({
//       success: true,
//       data: finalOrder,
//       message: "Order created successfully",
//     });
//   } catch (error) {
//     console.error("Error creating final order:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create order",
//       error: error.message,
//     });
//   }
// };
