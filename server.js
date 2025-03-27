const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const userRoutes = require('./routes/userRoutes');
const unprocessedOrderRoutes = require('./routes/unprocessedOrderRoutes');
const finalOrderRoutes = require('./routes/finalOrderRoutes');
const {
  scheduleTokenRefresh,
  scheduleFailedIntegrationCheck,
} = require('./utils/scheduler');

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/unprocessed-orders', unprocessedOrderRoutes);
app.use('/api/final-orders', finalOrderRoutes);
app.use('/api/shiprocket', require('./routes/shipRocketRoutes'));

// Base route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Schedule token refresh
  scheduleTokenRefresh();

  // Schedule failed integration check
  scheduleFailedIntegrationCheck();
});
