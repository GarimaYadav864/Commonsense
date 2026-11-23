const crypto = require("node:crypto");
const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Payment = require("../models/Payment");

const getRazorpayConfig = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const error = new Error("Razorpay test keys are not configured on the server");
    error.statusCode = 503;
    throw error;
  }
  return { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET };
};

const razorpayRequest = async (path, method = "GET", body) => {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.description || "Razorpay request failed");
    error.statusCode = response.status;
    throw error;
  }
  return data;
};

const createPaymentOrder = async (req, res) => {
  try {
    const { deliveryId, type, amount } = req.body;
    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      return res.status(400).json({ success: false, message: "A valid delivery is required" });
    }
    if (!["transport", "provider_contribution"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid payment type" });
    }

    const delivery = await Delivery.findOne({
      _id: deliveryId,
      requester: req.user._id,
      status: { $ne: "cancelled" },
    });
    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    let amountInPaise;
    if (type === "transport") {
      if (delivery.method !== "community_delivery" || delivery.quotedCost <= 0) {
        return res.status(400).json({ success: false, message: "No transportation charge is due for this delivery" });
      }
      const alreadyPaid = await Payment.exists({ delivery: delivery._id, type, status: "paid" });
      if (alreadyPaid) {
        return res.status(409).json({ success: false, message: "Transportation has already been paid" });
      }
      amountInPaise = Math.round(delivery.quotedCost * 100);
    } else {
      const contributionRupees = Number(amount);
      if (!Number.isFinite(contributionRupees) || contributionRupees < 1 || contributionRupees > 10000) {
        return res.status(400).json({ success: false, message: "Contribution must be between ₹1 and ₹10,000" });
      }
      amountInPaise = Math.round(contributionRupees * 100);
    }

    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({ success: false, message: "Payment amount must be at least ₹1" });
    }

    const order = await razorpayRequest("/orders", "POST", {
      amount: amountInPaise,
      currency: "INR",
      receipt: `cs_${delivery._id.toString().slice(-12)}_${Date.now().toString().slice(-8)}`,
      notes: {
        deliveryId: delivery._id.toString(),
        paymentType: type,
        payerId: req.user._id.toString(),
      },
    });

    await Payment.create({
      delivery: delivery._id,
      payer: req.user._id,
      beneficiary: delivery.provider,
      type,
      amount: amountInPaise,
      currency: "INR",
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.status(201).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      paymentType: type,
    });
  } catch (error) {
    console.error("Create payment order error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 503
        ? error.message
        : "Unable to start payment. Please try again.",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, message: "Payment verification details are incomplete" });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: orderId,
      payer: req.user._id,
    });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment order not found" });
    }
    if (payment.status === "paid") {
      return res.status(200).json({ success: true, message: "Payment already verified", payment });
    }

    const { keySecret } = getRazorpayConfig();
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${payment.razorpayOrderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({ success: false, message: "Payment signature verification failed" });
    }

    // Confirm status directly with Razorpay; never trust the browser callback alone.
    let razorpayPayment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
    if (razorpayPayment.order_id !== payment.razorpayOrderId || razorpayPayment.amount !== payment.amount) {
      return res.status(400).json({ success: false, message: "Payment details do not match this order" });
    }

    if (razorpayPayment.status === "authorized") {
      razorpayPayment = await razorpayRequest(
        `/payments/${encodeURIComponent(paymentId)}/capture`,
        "POST",
        { amount: payment.amount, currency: payment.currency }
      );
    }

    if (razorpayPayment.status !== "captured") {
      payment.status = razorpayPayment.status === "failed" ? "failed" : "authorized";
      payment.razorpayPaymentId = paymentId;
      await payment.save();
      return res.status(409).json({
        success: false,
        message: payment.status === "failed"
          ? "Razorpay reports that this payment failed."
          : "Payment is not captured yet. Please refresh and check again.",
      });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = paymentId;
    payment.paidAt = new Date();
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: payment._id,
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: "Unable to verify payment. Please check the transaction status before retrying.",
    });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ payer: req.user._id })
      .populate("delivery", "method quotedCost status")
      .populate("beneficiary", "name")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error("Get payments error:", error);
    return res.status(500).json({ success: false, message: "Unable to load payment history" });
  }
};

module.exports = { createPaymentOrder, verifyPayment, getMyPayments };
