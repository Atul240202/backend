const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const userRoutes = require("./routes/userRoutes");
const unprocessedOrderRoutes = require("./routes/unprocessedOrderRoutes");
const finalOrderRoutes = require("./routes/finalOrderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const phonepeRoutes = require("./routes/phonepeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const blogRoutes = require("./routes/blogRoutes");
const {
  scheduleTokenRefresh,
  // scheduleFailedIntegrationCheck,
} = require("./utils/scheduler");
const departmentRoutes = require("./routes/departmentRoutes");
const cookieParser = require("cookie-parser");
const imageUploadRoute = require("./routes/imageUploadRoute");
const blogImageUploadRoutes = require("./routes/blogImageUploadRoutes");
const contactRoutes = require("./routes/contactRoutes");
const variableProductsRoutes = require("./routes/productVariationRoutes");
const cron = require("node-cron");
const runBestSellerJob = require("./scripts/updateBestSellers");
const sendJobRoutes = require("./routes/sendJobRoutes");

dotenv.config();

// Connect to database
connectDB();

const app = express();
app.set("trust proxy", true);

// Middleware
app.use(cookieParser());
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL,
//     credentials: true,
//   })
// );
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://industrywaala.com",
      "https://www.industrywaala.com",
      "https://industrywaala.vercel.app",
      "https://ecommerce-frontend-lac-beta.vercel.app",
      "https://accounts.google.com",
      "https://ecom-admin-panel-one.vercel.app",
      "https://ecom-backend-e5fz.onrender.com",
      "https://backend-xx88.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// if (process.env.NODE_ENV === "production") {
//   cron.schedule("0 12 * * *", async () => {
//     console.log("⏰ Running 2 AM best-seller update...");
//     await runBestSellerJob();
//   });
// }
// Routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/users", userRoutes);
app.use("/api/unprocessed-orders", unprocessedOrderRoutes);
app.use("/api/final-orders", finalOrderRoutes);
app.use("/api/shiprocket", require("./routes/shipRocketRoutes"));
app.use("/api/admin/auth", require("./routes/adminAuthRoutes"));
app.use("/api/payment/phonepe", phonepeRoutes);
app.use("/api", reviewRoutes);
app.use("/api", imageUploadRoute);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api", contactRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api", blogImageUploadRoutes);
app.use("/api/variations", variableProductsRoutes);
app.use("/api/apply-job", sendJobRoutes);
//blogImageUploadRoutes
// Base route
app.get("/", (req, res) => {
  res.send("API is running...");
});
// Error middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Schedule token refresh
  scheduleTokenRefresh();

  // Schedule failed integration check
  // scheduleFailedIntegrationCheck();
});
