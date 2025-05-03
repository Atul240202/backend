const Blog = require("../models/blog.js");

exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      shortDescription,
      content,
      author,
      status,
      thumbnail,
      mainBanner,
      footerBanner,
      tags,
    } = req.body;

    const blog = new Blog({
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      shortDescription,
      content,
      author,
      status,
      thumbnail,
      mainBanner,
      footerBanner,
      tags,
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      shortDescription,
      content,
      author,
      status,
      thumbnail,
      mainBanner,
      footerBanner,
      tags,
    } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.title = title || blog.title;
    blog.slug =
      slug || title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || blog.slug;
    blog.shortDescription = shortDescription || blog.shortDescription;
    blog.content = content || blog.content;
    blog.thumbnail = thumbnail || blog.thumbnail;
    blog.mainBanner = mainBanner || blog.mainBanner;
    blog.footerBanner = footerBanner || blog.footerBanner;
    blog.author = author || blog.author;
    blog.status = status || blog.status;
    blog.tags = tags || blog.tags;
    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    await blog.deleteOne();
    res.json({ message: "Blog deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
