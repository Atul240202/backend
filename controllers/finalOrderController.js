const FinalOrder = require('../models/FinalOrder');
const UnprocessedOrder = require('../models/UnprocessedOrder');
const shipRocketController = require('./shipRocketController');

// Create a new final order
exports.createFinalOrder = async (req, res) => {
  try {
    const orderData = req.body;

    // Add user reference to the order
    orderData.user = req.user.id;

    // Create the final order
    const finalOrder = new FinalOrder(orderData);
    // Initialize ShipRocket API status
    finalOrder.shipRocketApiStatus = {
      success: false,
      statusCode: null,
      message: 'ShipRocket API not called yet',
    };
    await finalOrder.save();

    // If there's an unprocessed order ID, delete it
    if (orderData.unprocessed_order_id) {
      await UnprocessedOrder.findOneAndDelete({
        tempId: orderData.unprocessed_order_id,
      });
    }

    // Create order in ShipRocket
    try {
      // Format order data for ShipRocket
      const shipRocketOrderData = {
        order_id: orderData.order_id,
        order_date: orderData.order_date,
        pickup_location: orderData.pickup_location || 'Primary',
        channel_id: orderData.channel_id || '',
        comment: orderData.comment || 'Order created via API',
        reseller_name: orderData.comment || '',
        company_name: orderData.comment || '',
        billing_customer_name: orderData.billing_customer_name,
        billing_last_name: orderData.billing_last_name,
        billing_address: orderData.billing_address,
        billing_address_2: orderData.billing_address_2 || '',
        billing_isd_code: orderData.billing_isd_code || '91',
        billing_city: orderData.billing_city,
        billing_pincode: orderData.billing_pincode,
        billing_state: orderData.billing_state,
        billing_country: orderData.billing_country,
        billing_email: orderData.billing_email,
        billing_phone: orderData.billing_phone,
        billing_alternate_phone: orderData.billing_alternate_phone || '',
        shipping_is_billing: orderData.shipping_is_billing || 'true',
        shipping_customer_name: orderData.shipping_customer_name,
        shipping_last_name: orderData.shipping_last_name,
        shipping_address: orderData.shipping_address,
        shipping_address_2: orderData.shipping_address_2 || '',
        shipping_city: orderData.shipping_city,
        shipping_pincode: orderData.shipping_pincode,
        shipping_state: orderData.shipping_state,
        shipping_country: orderData.shipping_country,
        shipping_email: orderData.shipping_email,
        shipping_phone: orderData.shipping_phone,
        order_items: orderData.order_items,
        payment_method: orderData.payment_method === 'COD' ? 'COD' : 'Prepaid',
        shipping_charges: orderData.shipping_charges || '0',
        giftwrap_charges: orderData.giftwrap_charges || '0',
        transaction_charges: orderData.transaction_charges || '0',
        total_discount: orderData.total_discount || '0',
        sub_total: orderData.sub_total,
        length: orderData.length || '10',
        breadth: orderData.breadth || '10',
        height: orderData.height || '10',
        weight: orderData.weight || '0.5',
        ewaybill_no: orderData.ewaybill_no || '',
        customer_gstin: orderData.customer_gstin || '',
        invoice_number: orderData.invoice_number || '',
        order_type: orderData.order_type || 'Retail',
      };

      // Create ShipRocket order
      const shipRocketResponse = await shipRocketController.createOrder(
        shipRocketOrderData
      );

      // Update order with ShipRocket data
      finalOrder.shipRocketOrderId = shipRocketResponse.order_id;
      finalOrder.shipRocketShipmentId = shipRocketResponse.shipment_id;
      // Update ShipRocket API status to success
      finalOrder.shipRocketApiStatus = {
        success: true,
        statusCode: 200,
        message: 'ShipRocket order created successfully',
      };

      // Save updated order
      await finalOrder.save();

      // Get available couriers for automatic selection
      const availableCouriers = await shipRocketController.getAvailableCouriers(
        process.env.SHIPROCKET_PICKUP_PINCODE || '110001', // Default or configured pickup pincode
        orderData.shipping_pincode,
        orderData.weight || '0.5',
        orderData.payment_method === 'COD'
      );

      // Select the first available courier
      if (
        availableCouriers &&
        availableCouriers.data &&
        availableCouriers.data.available_courier_companies &&
        availableCouriers.data.available_courier_companies.length > 0
      ) {
        const selectedCourier =
          availableCouriers.data.available_courier_companies[0];

        // Assign AWB
        const awbResponse = await shipRocketController.assignAWB(
          shipRocketResponse.shipment_id,
          selectedCourier.courier_company_id
        );

        // Update order with AWB and courier details
        finalOrder.awbCode = awbResponse.awb_code;
        finalOrder.courierId = selectedCourier.courier_company_id;
        finalOrder.courierName = selectedCourier.courier_name;
        finalOrder.trackingUrl = awbResponse.tracking_url || '';
        finalOrder.shipmentStatus = 'AWB_ASSIGNED';

        // Save updated order
        await finalOrder.save();
      }
    } catch (shipRocketError) {
      console.error(
        'Error processing ShipRocket integration:',
        shipRocketError
      );
      // Continue with order creation even if ShipRocket fails
      // Update ShipRocket API status to failure
      finalOrder.shipRocketApiStatus = {
        success: false,
        statusCode: shipRocketError.response?.status || 500,
        message: shipRocketError.message || 'Failed to create ShipRocket order',
      };

      // Save updated order with error status
      await finalOrder.save();
    }

    res.status(201).json({
      success: true,
      data: finalOrder,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Error creating final order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
};

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
    console.error('Error fetching final orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
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
    console.error('Error fetching user final orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your orders',
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
        message: 'Order not found',
      });
    }

    // Check if the order belongs to the current user or if the user is an admin
    if (
      finalOrder.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order',
      });
    }

    res.status(200).json({
      success: true,
      data: finalOrder,
    });
  } catch (error) {
    console.error('Error fetching final order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
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
        message: 'Status is required',
      });
    }

    const finalOrder = await FinalOrder.findById(req.params.id);

    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    finalOrder.status = status;
    await finalOrder.save();

    res.status(200).json({
      success: true,
      data: finalOrder,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    console.error('Error updating final order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
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
        message: 'Order not found',
      });
    }

    await finalOrder.remove();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting final order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
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
        message: 'Order not found',
      });
    }

    // Format order data for ShipRocket
    const shipRocketOrderData = {
      order_id: finalOrder.order_id,
      order_date: finalOrder.order_date,
      pickup_location: finalOrder.pickup_location || 'Primary',
      channel_id: finalOrder.channel_id || '',
      comment: finalOrder.comment || 'Order created via API',
      reseller_name: finalOrder.comment || '',
      company_name: finalOrder.comment || '',
      billing_customer_name: finalOrder.billing_customer_name,
      billing_last_name: finalOrder.billing_last_name,
      billing_address: finalOrder.billing_address,
      billing_address_2: finalOrder.billing_address_2 || '',
      billing_isd_code: finalOrder.billing_isd_code || '91',
      billing_city: finalOrder.billing_city,
      billing_pincode: finalOrder.billing_pincode,
      billing_state: finalOrder.billing_state,
      billing_country: finalOrder.billing_country,
      billing_email: finalOrder.billing_email,
      billing_phone: finalOrder.billing_phone,
      billing_alternate_phone: finalOrder.billing_alternate_phone || '',
      shipping_is_billing: finalOrder.shipping_is_billing || 'true',
      shipping_customer_name: finalOrder.shipping_customer_name,
      shipping_last_name: finalOrder.shipping_last_name,
      shipping_address: finalOrder.shipping_address,
      shipping_address_2: finalOrder.shipping_address_2 || '',
      shipping_city: finalOrder.shipping_city,
      shipping_pincode: finalOrder.shipping_pincode,
      shipping_state: finalOrder.shipping_state,
      shipping_country: finalOrder.shipping_country,
      shipping_email: finalOrder.shipping_email,
      shipping_phone: finalOrder.shipping_phone,
      order_items: finalOrder.order_items,
      payment_method: finalOrder.payment_method === 'COD' ? 'COD' : 'Prepaid',
      shipping_charges: finalOrder.shipping_charges || '0',
      giftwrap_charges: finalOrder.giftwrap_charges || '0',
      transaction_charges: finalOrder.transaction_charges || '0',
      total_discount: finalOrder.total_discount || '0',
      sub_total: finalOrder.sub_total,
      length: finalOrder.length || '10',
      breadth: finalOrder.breadth || '10',
      height: finalOrder.height || '10',
      weight: finalOrder.weight || '0.5',
      ewaybill_no: finalOrder.ewaybill_no || '',
      customer_gstin: finalOrder.customer_gstin || '',
      invoice_number: finalOrder.invoice_number || '',
      order_type: finalOrder.order_type || 'Retail',
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
    const availableCouriers = await shipRocketController.getAvailableCouriers(
      process.env.SHIPROCKET_PICKUP_PINCODE || '110001',
      finalOrder.shipping_pincode,
      finalOrder.weight || '0.5',
      finalOrder.payment_method === 'COD'
    );

    // Select the first available courier
    if (
      availableCouriers &&
      availableCouriers.data &&
      availableCouriers.data.available_courier_companies &&
      availableCouriers.data.available_courier_companies.length > 0
    ) {
      const selectedCourier =
        availableCouriers.data.available_courier_companies[0];

      // Assign AWB
      const awbResponse = await shipRocketController.assignAWB(
        shipRocketResponse.shipment_id,
        selectedCourier.courier_company_id
      );

      // Update order with AWB and courier details
      finalOrder.awbCode = awbResponse.awb_code;
      finalOrder.courierId = selectedCourier.courier_company_id;
      finalOrder.courierName = selectedCourier.courier_name;
      finalOrder.trackingUrl = awbResponse.tracking_url || '';
      finalOrder.shipmentStatus = 'AWB_ASSIGNED';

      // Save updated order
      await finalOrder.save();
    }

    res.status(200).json({
      success: true,
      data: finalOrder,
      message: 'ShipRocket integration retried successfully',
    });
  } catch (error) {
    console.error('Error retrying ShipRocket integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry ShipRocket integration',
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
        message: 'Order not found',
      });
    }

    if (!finalOrder.awbCode) {
      return res.status(400).json({
        success: false,
        message: 'No AWB code available for tracking',
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
    console.error('Error tracking shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track shipment',
      error: error.message,
    });
  }
};
