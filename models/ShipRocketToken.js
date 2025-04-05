const mongoose = require('mongoose');

const shipRocketTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    company_id: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShipRocketToken', shipRocketTokenSchema);
