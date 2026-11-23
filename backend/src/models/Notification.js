
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      
      enum: [
        "offer_received",
        "offer_accepted",
        "offer_rejected",
        "delivery_arranged",
        "delivery_claimed",
        "delivery_dispatched",
        "delivery_status_updated",
        "delivery_received",
        "delivery_condition_reported",
        "damage_dispute_opened",
        "damage_dispute_updated",
        "request_matched",
        "request_update",
        "admin_new_request",
        "community_request_posted",
        "admin_new_resource",
        "admin_moderation_action",
        "admin_delivery_update",
        "general",
      ],

    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    relatedModel: {
      type: String,
      enum: ["Offer", "Request", "Resource", "Delivery", null],
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);
