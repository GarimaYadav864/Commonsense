const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Review = require("../models/Review");

const createDeliveryReview = async (req, res) => {
  try {
    const { rating, comment = "" } = req.body;
    const deliveryId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be a whole number from 1 to 5" });
    }
    if (typeof comment !== "string" || comment.trim().length > 1000) {
      return res.status(400).json({ success: false, message: "Review must be 1000 characters or fewer" });
    }

    const delivery = await Delivery.findOne({
      _id: deliveryId,
      requester: req.user._id,
      status: "received",
    });
    if (!delivery) {
      return res.status(403).json({ success: false, message: "Only the requester can review a completed delivery after confirming receipt" });
    }

    const review = await Review.create({
      delivery: delivery._id,
      reviewer: req.user._id,
      reviewee: delivery.provider,
      rating,
      comment: comment.trim(),
    });
    return res.status(201).json({ success: true, message: "Thank you for sharing your feedback", review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already reviewed this delivery" });
    }
    console.error("Create delivery review error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit review" });
  }
};

const getUserReputation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    const [summary, recentReviews, completedDeliveries] = await Promise.all([
      Review.aggregate([
        { $match: { reviewee: new mongoose.Types.ObjectId(req.params.userId) } },
        { $group: { _id: "$reviewee", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
      ]),
      Review.find({ reviewee: req.params.userId })
        .populate("reviewer", "name")
        .select("rating comment createdAt delivery")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Delivery.countDocuments({ provider: req.params.userId, status: "received" }),
    ]);
    const stats = summary[0] || { averageRating: null, reviewCount: 0 };
    return res.status(200).json({
      success: true,
      reputation: {
        averageRating: stats.averageRating === null ? null : Math.round(stats.averageRating * 10) / 10,
        reviewCount: stats.reviewCount,
        completedDeliveries,
      },
      reviews: recentReviews,
    });
  } catch (error) {
    console.error("Get user reputation error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch reputation" });
  }
};

module.exports = { createDeliveryReview, getUserReputation };
