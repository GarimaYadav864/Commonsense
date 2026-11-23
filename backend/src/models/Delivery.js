
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

    quotedCost: {
      type: Number,
      default: 0,
      min: 0,
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

    receivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);

