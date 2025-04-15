const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    default: function () {
      return this.id;
    },
  },
  units: {
    type: String,
    required: true,
  },
  selling_price: {
    type: String,
    required: true,
  },
  discount: {
    type: String,
    default: "0",
  },
  tax: {
    type: String,
    default: "0",
  },
  hsn: {
    type: String,
    default: "",
  },
});

const finalOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order_id: {
      type: String,
      required: true,
      unique: true,
    },
    order_date: {
      type: String,
      required: true,
    },
    pickup_location: {
      type: String,
      default: "Home",
    },
    channel_id: {
      type: String,
      default: "",
    },
    comment: {
      type: String,
      default: "",
    },
    reseller_name: {
      type: String,
      default: "",
    },
    company_name: {
      type: String,
      default: "",
    },
    billing_customer_name: {
      type: String,
      required: true,
    },
    billing_last_name: {
      type: String,
      required: true,
    },
    billing_address: {
      type: String,
      required: true,
    },
    billing_address_2: {
      type: String,
      default: "",
    },
    billing_isd_code: {
      type: String,
      default: "",
    },
    billing_city: {
      type: String,
      required: true,
    },
    billing_pincode: {
      type: String,
      required: true,
    },
    billing_state: {
      type: String,
      required: true,
    },
    billing_country: {
      type: String,
      required: true,
    },
    billing_email: {
      type: String,
      required: true,
    },
    billing_phone: {
      type: String,
      required: true,
    },
    billing_alternate_phone: {
      type: String,
      default: "",
    },
    shipping_is_billing: {
      type: Boolean,
      default: true,
    },
    shipping_customer_name: {
      type: String,
      required: true,
    },
    shipping_last_name: {
      type: String,
      required: true,
    },
    shipping_address: {
      type: String,
      required: true,
    },
    shipping_address_2: {
      type: String,
      default: "",
    },
    shipping_city: {
      type: String,
      required: true,
    },
    shipping_pincode: {
      type: String,
      required: true,
    },
    shipping_country: {
      type: String,
      required: true,
    },
    shipping_state: {
      type: String,
      required: true,
    },
    shipping_email: {
      type: String,
      required: true,
    },
    shipping_phone: {
      type: String,
      required: true,
    },
    order_items: [orderItemSchema],
    payment_method: {
      type: String,
      required: true,
    },
    shipping_charges: {
      type: String,
      default: "0",
    },
    giftwrap_charges: {
      type: String,
      default: "0",
    },
    transaction_charges: {
      type: String,
      default: "0",
    },
    total_discount: {
      type: String,
      default: "0",
    },
    sub_total: {
      type: String,
      required: true,
    },
    length: {
      type: String,
      default: "",
    },
    breadth: {
      type: String,
      default: "",
    },
    height: {
      type: String,
      default: "",
    },
    weight: {
      type: String,
      default: "",
    },
    ewaybill_no: {
      type: String,
      default: "",
    },
    customer_gstin: {
      type: String,
      default: "",
    },
    invoice_number: {
      type: String,
      default: "",
    },
    order_type: {
      type: String,
      default: "ESSENTIALS",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "payment confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    unprocessed_order_id: {
      type: String,
      default: null,
    },
    phonepeTransactionId: String,
    shipRocketOrderId: {
      type: String,
      default: null,
    },
    shipRocketShipmentId: {
      type: String,
      default: null,
    },
    awbCode: {
      type: String,
      default: null,
    },
    courierId: {
      type: String,
      default: null,
    },
    courierName: {
      type: String,
      default: null,
    },
    trackingUrl: {
      type: String,
      default: null,
    },
    shipmentStatus: {
      type: String,
      default: null,
    },
    pickupScheduledDate: {
      type: Date,
      default: null,
    },
    pickupToken: {
      type: String,
      default: null,
    },
    manifestUrl: {
      type: String,
      default: null,
    },
    labelUrl: {
      type: String,
      default: null,
    },
    invoiceUrl: {
      type: String,
      default: null,
    },
    // New field to track ShipRocket API response status
    shipRocketApiStatus: {
      success: {
        type: Boolean,
        default: null,
      },
      statusCode: {
        type: Number,
        default: null,
      },
      message: {
        type: String,
        default: null,
      },
    },
    phonepeApiResults: {
      success: {
        type: Boolean,
        default: null,
      },
      statusCode: {
        type: String,
        default: "",
      },
      transactionId: {
        type: String,
        default: "",
      },
      merchantTransactionId: {
        type: String,
        default: "",
      },
    },
    refund_status: {
      type: String,
      enum: ["notrequired", "pending", "success", "failed"],
      default: "notrequired",
    },
    refund_response: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinalOrder", finalOrderSchema);
