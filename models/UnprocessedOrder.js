const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  id: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  address1: { type: String, required: true },
  apartment: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postcode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, required: true },
});

const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  thumbnail: { type: String },
});

const UnprocessedOrderSchema = new mongoose.Schema({
  tempId: { type: String, required: true, unique: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [ProductSchema],

  shippingAddress: AddressSchema,
  billingAddress: AddressSchema,
  subtotal: { type: Number, required: true },
  shipping: { type: Number, required: true },
  total: { type: Number, required: true },
  reason: { type: String, required: true },
  phonepe: {
    transactionId: String,
    status: {
      type: String,
      enum: ["initiated", "success", "failed", "cancelled"],
      default: "initiated",
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create indexes for faster queries
UnprocessedOrderSchema.index({ userId: 1 });
UnprocessedOrderSchema.index({ tempId: 1 }, { unique: true });

module.exports = mongoose.model("UnprocessedOrder", UnprocessedOrderSchema);
