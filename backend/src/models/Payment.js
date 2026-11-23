const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      required: true,
      index: true,
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["transport", "provider_contribution"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 100,
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["created", "authorized", "paid", "failed"],
      default: "created",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ payer: 1, createdAt: -1 });
module.exports = mongoose.model("Payment", paymentSchema);
