const axios = require('axios');
const ShipRocketToken = require('../models/ShipRocketToken');

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
    console.error('Error getting active token:', error);
    throw new Error('Failed to get ShipRocket token');
  }
};

// Generate a new token
exports.generateNewToken = async () => {
  try {
    // Deactivate all existing tokens
    await ShipRocketToken.updateMany({}, { isActive: false });

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
    expiresAt.setDate(expiresAt.getDate() + 10);

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
    console.error('Error generating new token:', error);
    throw new Error('Failed to generate ShipRocket token');
  }
};

// Create a ShipRocket order
exports.createOrder = async (orderData) => {
  try {
    // Get authentication token
    const token = await this.getActiveToken();

    // Make API request to ShipRocket
    const response = await fetch(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${token}`,
        },
        body: JSON.stringify(orderData),
      }
    );

    // Parse response
    const data = await response.json();

    // Check if response is successful
    if (!response.ok) {
      // Throw error with status code and message
      const error = new Error(
        data.message || 'Failed to create ShipRocket order'
      );
      error.response = { status: response.status };
      throw error;
    }

    // Return successful response
    return data;
  } catch (error) {
    console.error('ShipRocket API Error:', error);
    throw error;
  }
};

// Assign AWB to shipment
exports.assignAWB = async (shipmentId, courierId) => {
  try {
    // Get active token
    const token = await this.getActiveToken();

    // Make API request to assign AWB
    const response = await axios.post(
      `${process.env.SHIPROCKET_API_URL}/courier/assign/awb`,
      {
        shipment_id: shipmentId,
        courier_id: courierId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error assigning AWB:', error);
    throw new Error('Failed to assign AWB');
  }
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
          Authorization: `${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching available couriers:', error);
    throw new Error('Failed to fetch available couriers');
  }
};

// Track shipment
exports.trackShipment = async (awbCode) => {
  try {
    // Get active token
    const token = await this.getActiveToken();

    // Make API request to track shipment
    const response = await axios.get(
      `${process.env.SHIPROCKET_API_URL}/courier/track/awb/${awbCode}`,
      {
        headers: {
          Authorization: `${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error tracking shipment:', error);
    throw new Error('Failed to track shipment');
  }
};

// Admin endpoint to manually refresh token
exports.refreshToken = async (req, res) => {
  try {
    const token = await this.generateNewToken();

    res.status(200).json({
      success: true,
      message: 'ShipRocket token refreshed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to refresh ShipRocket token',
      error: error.message,
    });
  }
};
