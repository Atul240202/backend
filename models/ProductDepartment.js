const mongoose = require("mongoose");

const productDepartmentSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    parent: { type: Number, default: 0 },
    description: { type: String, default: "" },
    display: { type: String, default: "default" },
    image: { type: Object, default: null },
    menu_order: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const ProductDepartment = mongoose.model(
  "ProductDepartment",
  productDepartmentSchema
);

module.exports = ProductDepartment;
