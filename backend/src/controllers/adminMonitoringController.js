
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const Offer = require("../models/Offer");
const Delivery = require("../models/Delivery");

const getMonitoringOverview = async (req, res) => {
  try {
    const [
      totalRequests,
      totalResources,
      totalOffers,
      totalDeliveries,
      requestStatuses,
      resourceStatuses,
      offerStatuses,
      deliveryStatuses,
      recentRequests,
      recentResources,
    ] = await Promise.all([
      Request.countDocuments(),
      Resource.countDocuments(),
      Offer.countDocuments(),
      Delivery.countDocuments(),

      Request.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Resource.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Offer.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Delivery.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Request.find()
        .select("title category quantity status location createdAt requester")
        .populate("requester", "name email")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      Resource.find()
        .select("title category quantity status location createdAt provider")
        .populate("provider", "name email")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const countStatus = (items, status) =>
      items.find((item) => item._id === status)?.count || 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalRequests,
        totalResources,
        totalOffers,
        totalDeliveries,
        pendingRequests: countStatus(requestStatuses, "pending"),
        matchingRequests: countStatus(requestStatuses, "matching"),
        offeredRequests: countStatus(requestStatuses, "offered"),
        fulfilledRequests: countStatus(requestStatuses, "fulfilled"),
        availableResources: countStatus(resourceStatuses, "available"),
        unavailableResources: countStatus(resourceStatuses, "unavailable"),
        acceptedOffers: countStatus(offerStatuses, "accepted"),
        completedDeliveries: countStatus(deliveryStatuses, "received"),
      },
      breakdown: {
        requests: requestStatuses,
        resources: resourceStatuses,
        offers: offerStatuses,
        deliveries: deliveryStatuses,
      },
      recentRequests,
      recentResources,
    });
  } catch (error) {
    console.error("Admin monitoring error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load monitoring overview",
    });
  }
};

module.exports = { getMonitoringOverview };

