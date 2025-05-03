const express = require("express");
const router = express.Router();
const multer = require("multer");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/upload-blog-image?blogId=abc123&category=mainBanner
router.post("/upload-blog-image", upload.single("image"), async (req, res) => {
  try {
    const { blogId, category } = req.query;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No image uploaded" });
    if (!blogId || !category) {
      return res
        .status(400)
        .json({ error: "Missing blogId or category in query" });
    }

    const extension = file.originalname.split(".").pop();
    const fileName = `blogs/${blogId}/${category}/${uuidv4()}.${extension}`;

    const params = {
      Bucket: process.env.S3_BLOG_BUCKET_NAME_IMAGE,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read", // Optional
    };

    await s3.putObject(params).promise();

    const imageUrl = `https://${process.env.S3_BLOG_BUCKET_NAME_IMAGE}.s3.${process.env.BLOG_AWS_REGION}.amazonaws.com/${fileName}`;
    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error("Blog Image Upload Error:", error);
    res.status(500).json({ error: "Failed to upload blog image" });
  }
});

module.exports = router;
