
const User = require("../models/User");
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const Offer = require("../models/Offer");
const Delivery = require("../models/Delivery");

// GET ADMIN DASHBOARD STATISTICS
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      requesters,
      providers,
      volunteers,
      totalRequests,
      activeRequests,
      totalResources,
      availableResources,
      totalOffers,
      acceptedOffers,
      totalDeliveries,
      completedDeliveries,
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ role: "requester" }),
      User.countDocuments({ role: "provider" }),
      User.countDocuments({ role: "volunteer" }),

      // Requests
      Request.countDocuments(),
      Request.countDocuments({
        status: {
          $in: ["pending", "matching", "offered"],
        },
      }),

      // Resources
      Resource.countDocuments(),
      Resource.countDocuments({ status: "available" }),

      // Offers
      Offer.countDocuments(),
      Offer.countDocuments({ status: "accepted" }),

      // Deliveries
      Delivery.countDocuments(),
      Delivery.countDocuments({ status: "received" }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          requesters,
          providers,
          volunteers,
        },
        requests: {
          total: totalRequests,
          active: activeRequests,
        },
        resources: {
          total: totalResources,
          available: availableResources,
        },
        offers: {
          total: totalOffers,
          accepted: acceptedOffers,
        },
        deliveries: {
          total: totalDeliveries,
          completed: completedDeliveries,
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load admin dashboard",
    });
  }
};

module.exports = { getDashboardStats };
