const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true });

reviewSchema.index({ delivery: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
