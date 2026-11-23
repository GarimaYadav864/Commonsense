
const Resource = require("../models/Resource");

const findMatches = async (request, excludedResourceIds = []) => {
  const resources = await Resource.find({
    category: request.category.toLowerCase(),
    status: "available",
    quantity: { $gte: request.quantity },
    provider: { $ne: request.requester },
    _id: { $nin: excludedResourceIds },
  })
    .populate("provider", "name location")
    .lean();

  const requestedLocation = request.location.trim().toLowerCase();

  return resources
    .map((resource) => ({
      ...resource,
      locationMatch:
        resource.location.trim().toLowerCase() === requestedLocation,
      quantitySurplus: resource.quantity - request.quantity,
    }))
    .sort((a, b) => {
      if (a.locationMatch !== b.locationMatch) {
        return a.locationMatch ? -1 : 1;
      }

      if (a.quantitySurplus !== b.quantitySurplus) {
        return a.quantitySurplus - b.quantitySurplus;
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
};

module.exports = { findMatches };
