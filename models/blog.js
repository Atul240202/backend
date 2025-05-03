const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String },
    content: { type: String, required: true },
    author: { type: String },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    thumbnail: { type: String, required: true },
    mainBanner: { type: String, required: true },
    footerBanner: String,
    tags: [String],
  },
  { timestamps: true }
);

const Blog = mongoose.model("Blog", blogSchema);
module.exports = Blog;
