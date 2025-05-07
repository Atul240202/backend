const mongoose = require("mongoose");
const { Schema } = mongoose;

const bestSellerProductSchema = new Schema(
  {
    id: Number,
    name: String,
    description: String,
    price: String,
    regular_price: String,
    sale_price: String,
    on_sale: Boolean,
    average_rating: String,
    stock_status: String,
    images: [
      {
        id: Number,
        src: String,
        name: String,
        alt: String,
      },
    ],
    categories: [
      {
        id: Number,
        name: String,
        slug: String,
      },
    ],
    slug: String,
    sku: String,
    type: String,
    variations: [Number],
    status: String,
  },
  { _id: false } // Important: Prevents auto-adding _id in sub-documents
);

const bestSellerCacheSchema = new Schema({
  range: {
    type: String,
    enum: ["week", "month", "lifetime"],
    required: true,
    unique: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  products: [bestSellerProductSchema], // ✅ Nested schema reference
});

module.exports = mongoose.model("BestSellerCache", bestSellerCacheSchema);
