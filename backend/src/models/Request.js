
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
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
      min: 0.01,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
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

    urgency: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "matching",
        "offered",
        "fulfilled",
        "cancelled",
      ],
      default: "pending",
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const validateCoordinates = function (next) {
  const hasLatitude = this.latitude != null;
  const hasLongitude = this.longitude != null;

  if (hasLatitude !== hasLongitude) {
    return next(
      new Error("Latitude and longitude must be provided together")
    );
  }

  next();
};

requestSchema.pre("validate", validateCoordinates);

module.exports = mongoose.model("Request", requestSchema);
