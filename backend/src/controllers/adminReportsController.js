
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const Offer = require("../models/Offer");
const Delivery = require("../models/Delivery");

const countStatuses = async (Model, statuses) => {
  const results = await Promise.all(
    statuses.map(async (status) => ({
      status,
      count: await Model.countDocuments({ status }),
    }))
  );

  return results;
};

const getAdminReports = async (req, res) => {
  try {
    const requestStatuses = [
      "pending",
      "matching",
      "offered",
      "fulfilled",
      "cancelled",
    ];

    const resourceStatuses = [
      "available",
      "unavailable",
      "fulfilled",
    ];

    const offerStatuses = [
      "pending",
      "accepted",
      "rejected",
      "cancelled",
    ];

    const deliveryStatuses = [
      "arranged",
      "dispatched",
      "delivered",
      "received",
      "cancelled",
    ];

    const [
      totalRequests,
      totalResources,
      totalOffers,
      totalDeliveries,
      requestsByStatus,
      resourcesByStatus,
      offersByStatus,
      deliveriesByStatus,
      recentRequests,
      recentResources,
    ] = await Promise.all([
      Request.countDocuments(),
      Resource.countDocuments(),
      Offer.countDocuments(),
      Delivery.countDocuments(),

      countStatuses(Request, requestStatuses),
      countStatuses(Resource, resourceStatuses),
      countStatuses(Offer, offerStatuses),
      countStatuses(Delivery, deliveryStatuses),

      Request.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),

      Resource.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    const getCount = (items, status) =>
      items.find((item) => item.status === status)?.count || 0;

    const fulfilledRequests = getCount(requestsByStatus, "fulfilled");
    const acceptedOffers = getCount(offersByStatus, "accepted");
    const receivedDeliveries = getCount(deliveriesByStatus, "received");

    return res.status(200).json({
      success: true,
      generatedAt: new Date(),

      overview: {
        totalRequests,
        totalResources,
        totalOffers,
        totalDeliveries,

        fulfilledRequests,
        acceptedOffers,
        receivedDeliveries,

        requestFulfilmentRate:
          totalRequests > 0
            ? Number(
                ((fulfilledRequests / totalRequests) * 100).toFixed(1)
              )
            : 0,

        offerAcceptanceRate:
          totalOffers > 0
            ? Number(
                ((acceptedOffers / totalOffers) * 100).toFixed(1)
              )
            : 0,

        deliveryCompletionRate:
          totalDeliveries > 0
            ? Number(
                ((receivedDeliveries / totalDeliveries) * 100).toFixed(1)
              )
            : 0,

        requestsCreatedLast7Days: recentRequests,
        resourcesCreatedLast7Days: recentResources,
      },

      breakdown: {
        requests: requestsByStatus,
        resources: resourcesByStatus,
        offers: offersByStatus,
        deliveries: deliveriesByStatus,
      },
    });
  } catch (error) {
    console.error("Admin reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate operational reports",
    });
  }
};

module.exports = { getAdminReports };
