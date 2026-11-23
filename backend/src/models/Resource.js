
const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    condition: {
      type: String,
      enum: ["new", "good", "fair", "not-applicable"],
      default: "good",
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },

    // Inventory state
    status: {
      type: String,
      enum: ["available", "unavailable", "fulfilled"],
      default: "available",
    },

    // Provider's listing preference, independent of stock.
    providerAvailability: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

resourceSchema.pre("validate", function (next) {
  const hasLatitude = this.latitude != null;
  const hasLongitude = this.longitude != null;

  if (hasLatitude !== hasLongitude) {
    return next(
      new Error("Latitude and longitude must be provided together")
    );
  }

  next();
});

// Public matching queries can efficiently filter active listings.
resourceSchema.index({
  providerAvailability: 1,
  status: 1,
  category: 1,
  quantity: 1,
});

module.exports = mongoose.model("Resource", resourceSchema);
