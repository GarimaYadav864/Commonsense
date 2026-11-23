const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const VolunteerReview = require("../models/VolunteerReview");

const createVolunteerReview = async (req, res) => {
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
      method: "community_delivery",
      volunteer: { $ne: null },
    });
    if (!delivery) {
      return res.status(403).json({ success: false, message: "Only the requester can review the assigned volunteer after confirming receipt of a community delivery" });
    }

    const review = await VolunteerReview.create({
      delivery: delivery._id,
      reviewer: req.user._id,
      volunteer: delivery.volunteer,
      rating,
      comment: comment.trim(),
    });
    return res.status(201).json({ success: true, message: "Thank you for rating your volunteer", review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already reviewed the volunteer for this delivery" });
    }
    console.error("Create volunteer review error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit volunteer review" });
  }
};

const getVolunteerReputation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    const volunteerId = new mongoose.Types.ObjectId(req.params.userId);
    const [summary, recentReviews, completedDeliveries] = await Promise.all([
      VolunteerReview.aggregate([
        { $match: { volunteer: volunteerId } },
        { $group: { _id: "$volunteer", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
      ]),
      VolunteerReview.find({ volunteer: volunteerId })
        .populate("reviewer", "name")
        .select("rating comment createdAt delivery")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Delivery.countDocuments({ volunteer: volunteerId, status: "received" }),
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
    console.error("Get volunteer reputation error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch volunteer reputation" });
  }
};

module.exports = { createVolunteerReview, getVolunteerReputation };
