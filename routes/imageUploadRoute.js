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

router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No image uploaded" });

    const extension = file.originalname.split(".").pop();
    const fileName = `products/${uuidv4()}.${extension}`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME_IMAGE,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read", // Optional: makes image public
    };

    await s3.putObject(params).promise();

    const imageUrl = `https://${process.env.S3_BUCKET_NAME_IMAGE}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error("Image Upload Error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

module.exports = router;
