
const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "REQUEST_CANCELLED",
        "RESOURCE_STATUS_CHANGED",
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["Request", "Resource"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ admin: 1, createdAt: -1 });

module.exports = mongoose.model(
  "AdminAuditLog",
  adminAuditLogSchema
);
