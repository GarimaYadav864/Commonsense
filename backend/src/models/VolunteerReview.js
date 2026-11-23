const mongoose = require("mongoose");

const volunteerReviewSchema = new mongoose.Schema({
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true });

volunteerReviewSchema.index({ delivery: 1, reviewer: 1 }, { unique: true });
volunteerReviewSchema.index({ volunteer: 1, createdAt: -1 });

module.exports = mongoose.model("VolunteerReview", volunteerReviewSchema);
