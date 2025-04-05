// Backend/utils/scheduler.js
const cron = require('node-cron');
const shipRocketController = require('../controllers/shipRocketController');

// Schedule token refresh every 5 days (before the 10-day expiry)
const scheduleTokenRefresh = () => {
  // Run at midnight everyday
  cron.schedule('0 0 * * *', async () => {
    try {
      await shipRocketController.generateNewToken();
    } catch (error) {
      console.error('Error refreshing ShipRocket token:', error);
    }
  });
};

// Schedule check for failed ShipRocket integrations
const scheduleFailedIntegrationCheck = () => {
  // Run every 1 hours
  cron.schedule('0 0 * * *', async () => {
    try {
      const FinalOrder = require('../models/FinalOrder');
      const shipRocketController = require('../controllers/shipRocketController');

      // Find orders without ShipRocket IDs
      const failedOrders = await FinalOrder.find({
        shipRocketOrderId: null,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      });

      // Process each failed order
      for (const orderData of failedOrders) {
        try {
          // Format order data for ShipRocket
          const shipRocketOrderData = {
            order_id: orderData.order_id,
            order_date: orderData.order_date,
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Home',
            channel_id: orderData.channel_id || '2970164',
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
            shipping_is_billing: orderData.shipping_is_billing || true,
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
            payment_method:
              orderData.payment_method === 'COD' ? 'COD' : 'Prepaid',
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
            order_type: orderData.order_type || 'ESSENTIALS',
          };

          // Create ShipRocket order
          const shipRocketResponse = await shipRocketController.createOrder(
            shipRocketOrderData
          );

          // Update order with ShipRocket data
          order.shipRocketOrderId = shipRocketResponse.order_id;
          order.shipRocketShipmentId = shipRocketResponse.shipment_id;

          // Save updated order
          await order.save();

          // Get available couriers for automatic selection
          const availableCouriers =
            await shipRocketController.getAvailableCouriers(
              process.env.SHIPROCKET_PICKUP_PINCODE,
              order.shipping_pincode,
              order.weight || '0.5',
              order.payment_method === 'COD'
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
            order.awbCode = awbResponse.awb_code;
            order.courierId = selectedCourier.courier_company_id;
            order.courierName = selectedCourier.courier_name;
            order.trackingUrl = awbResponse.tracking_url || '';
            order.shipmentStatus = 'AWB_ASSIGNED';

            // Save updated order
            await order.save();
          }
        } catch (error) {
          console.error(
            `Error processing failed integration for order ID ${order.order_id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        'Error checking for failed ShipRocket integrations:',
        error
      );
    }
  });
};

module.exports = {
  scheduleTokenRefresh,
  scheduleFailedIntegrationCheck,
};
