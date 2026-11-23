const mongoose = require("mongoose");

const disputeEventSchema = new mongoose.Schema({
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actorRole: { type: String, enum: ["requester", "provider", "admin"], required: true },
  eventType: { type: String, enum: ["dispute_opened", "provider_responded", "dispute_resolved", "dispute_rejected"], required: true },
  status: { type: String, enum: ["open", "provider_responded", "resolved", "rejected"], required: true },
  message: { type: String, trim: true, maxlength: 1500, default: "" },
  decision: { type: String, enum: ["replacement", "partial_resolution", "no_action", "other", null], default: null },
}, { timestamps: true });

disputeEventSchema.index({ delivery: 1, createdAt: 1 });

module.exports = mongoose.model("DisputeEvent", disputeEventSchema);
