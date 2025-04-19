const axios = require("axios");
const ShipRocketToken = require("../models/ShipRocketToken");
const FinalOrder = require("../models/FinalOrder");
// Get active token or generate a new one
exports.getActiveToken = async () => {
  try {
    // Find the most recent active token
    const activeToken = await ShipRocketToken.findOne({ isActive: true }).sort({
      createdAt: -1,
    });

    // If token exists and is not expired, return it
    if (activeToken && new Date(activeToken.expiresAt) > new Date()) {
      return activeToken.token;
    }

    // If token doesn't exist or is expired, generate a new one
    return await this.generateNewToken();
  } catch (error) {
    console.error("Error getting active token:", error);
    throw new Error("Failed to get ShipRocket token");
  }
};

// Generate a new token
exports.generateNewToken = async () => {
  try {
    // Deactivate all existing tokens
    await ShipRocketToken.updateMany({}, { isActive: false });
    // Delete all existing tokens
    await ShipRocketToken.deleteMany({});
    // Make API request to generate new token
    const response = await axios.post(
      `${process.env.SHIPROCKET_API_URL}/auth/login`,
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }
    );

    // Calculate expiry date (10 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 5);

    // Save new token to database
    const newToken = new ShipRocketToken({
      token: response.data.token,
      company_id: response.data.company_id,
      email: response.data.email,
      expiresAt,
      isActive: true,
    });

    await newToken.save();

    return response.data.token;
  } catch (error) {
    console.error("Error generating new token:", error);
    throw new Error("Failed to generate ShipRocket token");
  }
};

// Create a ShipRocket order
exports.createOrder = async (orderData) => {
  try {
    // Get authentication token
    const token = await this.getActiveToken();
    console.log("shiprocket token", token);
    console.log("shiprocket orderData", orderData);
    // Make API request to ShipRocket
    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      }
    );
    console.log("shiprocket token response", response);

    // Parse response
    const data = await response.json();
    // Check if response is successful
    if (!response.ok) {
      // Throw error with status code and message
      const error = new Error(
        data.message || "Failed to create ShipRocket order"
      );
      error.response = { status: response.status };
      throw error;
    }

    // Return successful response
    return data;
  } catch (error) {
    console.error("ShipRocket API Error:", error);
    throw error;
  }
};

// Assign AWB to shipment
exports.assignAWB = async (shipment_id, courier_id = null, status = "") => {
  const token = await this.getActiveToken();

  const body = {
    shipment_id,
    ...(courier_id && { courier_id }),
    ...(status && { status }),
  };

  const response = await fetch(
    "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shiprocket AWB Assignment failed: ${error}`);
  }

  const data = await response.json();
  return data;
};

// Get available courier services
exports.getAvailableCouriers = async (
  pickupPostcode,
  deliveryPostcode,
  weight,
  cod = false
) => {
  try {
    // Get active token
    const token = await this.getActiveToken();

    // Make API request to get available couriers
    const response = await axios.get(
      `${process.env.SHIPROCKET_API_URL}/courier/serviceability`,
      {
        params: {
          pickup_postcode: pickupPostcode,
          delivery_postcode: deliveryPostcode,
          weight,
          cod: cod ? 1 : 0,
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching available couriers:", error);
    throw new Error("Failed to fetch available couriers");
  }
};

// Track shipment
exports.trackShipment = async (orderId) => {
  try {
    // Get active token
    const token = await this.getActiveToken();

    // Make API request to track shipment
    const response = await axios.get(
      `${process.env.SHIPROCKET_API_URL}/courier/track?order_id=${orderId}&channel_id=${process.env.SHIPROCKET_CHANNEL_ID}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error tracking shipment:", error);
    throw new Error("Failed to track shipment");
  }
};

// Admin endpoint to manually refresh token
exports.refreshToken = async (req, res) => {
  try {
    const token = await this.generateNewToken();

    res.status(200).json({
      success: true,
      message: "ShipRocket token refreshed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to refresh ShipRocket token",
      error: error.message,
    });
  }
};

// Function to fetch order details from ShipRocket
// exports.getShipRocketOrder = async (orderId) => {
//   try {
//     const token = await this.getActiveToken();

//     const response = await axios.get(
//       `${SHIPROCKET_API_URL}/orders/${orderId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     return response.data.data;
//   } catch (error) {
//     console.error(
//       `Error fetching ShipRocket order details for order ID ${orderId}:`,
//       error
//     );
//     throw new Error("Failed to fetch ShipRocket order details");
//   }
// };

exports.cancelShipments = async (awbList = []) => {
  const token = await this.getActiveToken();

  const awbs = Array.isArray(awbList) ? awbList : [awbList];

  try {
    const response = await axios.post(
      `${process.env.SHIPROCKET_API_URL}/orders/cancel/shipment/awbs`,
      { awbs },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    await FinalOrder.updateMany(
      { awbCode: { $in: awbs } },
      { $set: { status: "cancelled" } }
    );

    return response.data;
  } catch (error) {
    console.error("Cancel AWB error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "AWB cancellation failed");
  }
};

exports.cancelOrderByOrderId = async (orderIds = []) => {
  const token = await this.getActiveToken();

  const idsArray = Array.isArray(orderIds) ? orderIds : [orderIds];

  try {
    const response = await axios.post(
      `${process.env.SHIPROCKET_API_URL}/orders/cancel`,
      { ids: idsArray },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    await FinalOrder.updateMany(
      { shipRocketOrderId: { $in: idsArray } },
      { $set: { status: "cancelled" } }
    );
    return response.data;
  } catch (error) {
    console.error("Cancel error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "User cancellation failed"
    );
  }
};

exports.generateManifest = async (shipmentIds = []) => {
  const token = await this.getActiveToken();
  const response = await axios.post(
    `${process.env.SHIPROCKET_API_URL}/manifests/generate`,
    { shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds] },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

exports.printManifest = async (orderIds = []) => {
  const token = await this.getActiveToken();
  const response = await axios.post(
    `${process.env.SHIPROCKET_API_URL}/manifests/print`,
    { order_ids: Array.isArray(orderIds) ? orderIds : [orderIds] },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

exports.generateLabel = async (shipmentIds = []) => {
  const token = await this.getActiveToken();
  const response = await axios.post(
    `${process.env.SHIPROCKET_API_URL}/courier/generate/label`,
    { shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds] },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

exports.generateTaxInvoice = async (orderIds = []) => {
  const token = await this.getActiveToken();
  const response = await axios.post(
    `${process.env.SHIPROCKET_API_URL}/orders/print/invoice`,
    { ids: Array.isArray(orderIds) ? orderIds : [orderIds] },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

exports.getShiprocketOrderDetails = async (orderId) => {
  const token = await this.getActiveToken();
  const response = await axios.get(
    `${process.env.SHIPROCKET_API_URL}/orders/show/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

exports.createReturnOrder = async (returnData) => {
  const token = await this.getActiveToken();
  const response = await axios.post(
    `${process.env.SHIPROCKET_API_URL}/orders/create/return`,
    returnData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
