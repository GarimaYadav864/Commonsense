
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
      unique: true,
    },

    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },


    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    volunteerAssignedAt: {
      type: Date,
      default: null,
    },


    method: {
      type: String,
      enum: ["self_pickup", "community_delivery"],
      required: true,
    },

    pickupAddress: {
      type: String,
      trim: true,
    },

    deliveryAddress: {
      type: String,
      trim: true,
    },

    transportDetails: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    quotedCost: { type: Number, default: 0, min: 0 },

    distanceKm: { type: Number, min: 0, default: null },

    pricingMethod: {
      type: String,
      enum: ["gps_estimate", "self_pickup", "manual"],
      default: "self_pickup",
    },

    costBreakdown: {
      baseFare: { type: Number, min: 0 },
      ratePerKm: { type: Number, min: 0 },
      distanceCharge: { type: Number, min: 0 },
      straightLineKm: { type: Number, min: 0 },
      roadDistanceFactor: { type: Number, min: 1 },
    },

    costCurrency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: [
        "arranged",
        "dispatched",
        "in_transit",
        "delivered",
        "received",
        "cancelled",
      ],
      default: "arranged",
    },

    providerConfirmed: {
      type: Boolean,
      default: false,
    },

    requesterConfirmed: {
      type: Boolean,
      default: false,
    },

    dispatchedAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    volunteerLocation: {
      latitude: { type: Number, min: -90, max: 90, default: null },
      longitude: { type: Number, min: -180, max: 180, default: null },
      updatedAt: { type: Date, default: null },
    },

    receivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);

