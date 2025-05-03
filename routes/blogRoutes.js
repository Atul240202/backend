const express = require("express");
const router = express.Router();
const {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  getBlogBySlug,
} = require("../controllers/blogController");
const { isAdmin, protectAdmin } = require("../middleware/authMiddleware");

router.post("/", protectAdmin, isAdmin, createBlog);
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
router.get("/slug/:slug", getBlogBySlug);
router.put("/:id", protectAdmin, isAdmin, updateBlog);
router.delete("/:id", protectAdmin, isAdmin, deleteBlog);

module.exports = router;
