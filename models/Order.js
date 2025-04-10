const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  units: {
    type: Number,
    required: true,
  },
  selling_price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  hsn: {
    type: String,
    default: "",
  },
});

const orderSchema = new mongoose.Schema(
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
      type: Date,
      default: Date.now,
    },
    pickup_location: {
      type: String,
      default: "Home",
    },
    channel_id: {
      type: String,
      default: "2970164",
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
      default: "",
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
      default: "",
    },
    shipping_last_name: {
      type: String,
      default: "",
    },
    shipping_address: {
      type: String,
      default: "",
    },
    shipping_address_2: {
      type: String,
      default: "",
    },
    shipping_city: {
      type: String,
      default: "",
    },
    shipping_pincode: {
      type: String,
      default: "",
    },
    shipping_country: {
      type: String,
      default: "",
    },
    shipping_state: {
      type: String,
      default: "",
    },
    shipping_email: {
      type: String,
      default: "",
    },
    shipping_phone: {
      type: String,
      default: "",
    },
    order_items: [orderItemSchema],
    payment_method: {
      type: String,
      required: true,
    },
    shipping_charges: {
      type: Number,
      default: 0,
    },
    giftwrap_charges: {
      type: Number,
      default: 0,
    },
    transaction_charges: {
      type: Number,
      default: 0,
    },
    total_discount: {
      type: Number,
      default: 0,
    },
    sub_total: {
      type: Number,
      required: true,
    },
    length: {
      type: Number,
      default: 0,
    },
    breadth: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    weight: {
      type: Number,
      default: 0,
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
      enum: ["processing", "confirmed", "shipped", "delivered", "cancelled"],
      default: "processing",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
