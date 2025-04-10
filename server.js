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
const {
  scheduleTokenRefresh,
  scheduleFailedIntegrationCheck,
} = require("./utils/scheduler");
const cookieParser = require("cookie-parser");

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cookieParser());
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL,
//     credentials: true,
//   })
// );
app.use(express.json());
// Configure CORS with specific options
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Development
      "https://industrywaala.com", // Production
      "https://ecommerce-frontend-lac-beta.vercel.app",
      "https://accounts.google.com", // Allow Google's authentication servers
      "http://localhost:3000", //Admin panel
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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
app.use("/api", reviewRoutes);
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
  scheduleFailedIntegrationCheck();
});
