const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AdminUser = require("../models/AdminUser");
const asyncHandler = require("express-async-handler");

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization) {
    try {
      // Log the full header and token for debugging
      console.log("Authorization header:", req.headers.authorization);

      token = req.headers.authorization.split(" ")[1];
      console.log("Extracted token:", token);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as an admin");
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
  next();
};

// Protect admin routes
const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  // Check if token exists in headers or cookies
  if (req.headers.authorization || req.cookies.adminToken) {
    try {
      // Get token from header or cookie
      token = req.headers.authorization
        ? req.headers.authorization.split(" ")[1]
        : req.cookies.adminToken;

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get admin user from token
      req.user = await AdminUser.findById(decoded.id).select("-password");

      if (!req.user) {
        throw new Error("Admin user not found");
      }

      next();
    } catch (error) {
      console.error("Admin auth middleware error:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

module.exports = { protect, admin, protectAdmin, isAdmin };
