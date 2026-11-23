
const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
    },

    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
    },

    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "expired",
        "cancelled",
      ],
      default: "pending",
    },

    offeredAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },

    respondedAt: {
      type: Date,
      default: null,
    },

    requesterConfirmed: {
      type: Boolean,
      default: false,
    },

    requesterConfirmedAt: {
      type: Date,
      default: null,
    },

    requesterConfirmationExpiresAt: {
      type: Date,
      default: null,
    },

  },
  { timestamps: true }
);

// Prevent the same resource from being offered twice
// for the same request.
offerSchema.index(
  { request: 1, resource: 1 },
  { unique: true }
);

// Only one pending offer per request at a time.
offerSchema.index(
  { request: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "one_pending_offer_per_request",
  }
);


// Helps the expiry worker find accepted offers
// that are still awaiting requester confirmation.
offerSchema.index(
  {
    status: 1,
    requesterConfirmed: 1,
    requesterConfirmationExpiresAt: 1,
  },
  {
    name: "requester_confirmation_expiry",
  }
);


module.exports = mongoose.model("Offer", offerSchema);
