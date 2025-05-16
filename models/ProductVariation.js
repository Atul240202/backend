const mongoose = require("mongoose");

const variationSchema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    slug: String,
    parent_id: Number,
    type: { type: String, default: "variation" },
    permalink: String,
    description: String,
    sku: String,
    price: String,
    regular_price: String,
    sale_price: String,
    on_sale: Boolean,
    status: String,
    purchasable: Boolean,
    virtual: Boolean,
    downloadable: Boolean,
    downloads: [Object],
    download_limit: Number,
    download_expiry: Number,
    tax_status: String,
    tax_class: String,
    manage_stock: Boolean,
    stock_quantity: Number,
    stock_status: String,
    backorders: String,
    backorders_allowed: Boolean,
    backordered: Boolean,
    weight: String,
    dimensions: {
      length: String,
      width: String,
      height: String,
    },
    shipping_class: String,
    shipping_class_id: Number,
    image: [Object],
    attributes: [
      {
        id: Number,
        name: String,
        slug: String,
        option: String,
      },
    ],
    menu_order: Number,
    meta_data: [Object],
    _links: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductVariation", variationSchema);
