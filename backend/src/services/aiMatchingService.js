
const Resource = require("../models/Resource");

const getAIMatches = async (request, excludedResourceIds = []) => {
  // Fetch only resources that are eligible for matching.
  const resources = await Resource.find({
    category: request.category.toLowerCase(),
    status: "available",
    providerAvailability: { $ne: "paused" },
    quantity: { $gte: request.quantity },
    provider: { $ne: request.requester },
    _id: { $nin: excludedResourceIds },
  })
    .populate("provider", "name location")
    .lean();

  // Prepare data for the Python AI service.
  const payload = {
    request: {
      request_id: request._id.toString(),
      category: request.category,
      quantity: request.quantity,
      unit: request.unit,
      urgency: request.urgency || "medium",
      location: request.location,
      latitude: request.latitude,
      longitude: request.longitude,
    },

    candidates: resources
      .filter((resource) => resource.provider)
      .map((resource) => ({
        resource_id: resource._id.toString(),
        provider_id: resource.provider._id.toString(),
        category: resource.category,
        quantity_available: resource.quantity,
        unit: resource.unit,
        location: resource.location,
        latitude: resource.latitude,
        longitude: resource.longitude,
        available: resource.status === "available",
        condition: resource.condition || "good",
      })),
  };

  const aiServiceUrl = process.env.AI_SERVICE_URL;

  if (!aiServiceUrl) {
    throw new Error("AI_SERVICE_URL is not configured");
  }

  let response;

  try {
    response = await fetch(
      `${aiServiceUrl.replace(/\/+$/, "")}/api/matching/rank`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }
    );
  } catch (error) {
    console.error("AI matching service connection error:", error.message);
    throw new Error("Unable to connect to AI matching service");
  }

  if (!response.ok) {
    const errorBody = await response.text();

    console.error(
      `AI matching service returned ${response.status}:`,
      errorBody
    );

    throw new Error(`AI matching service failed with status ${response.status}`);
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("AI matching service returned invalid JSON");
  }

  // The offer controller currently expects { matches: [...] }.
  if (!result || !Array.isArray(result.matches)) {
    throw new Error(
      "Invalid AI response: expected a matches array"
    );
  }

  // Keep only candidates that have the identifiers needed
  // for the offer controller to revalidate the resource.
  const validMatches = result.matches.filter(
    (candidate) =>
      candidate &&
      typeof candidate.resource_id === "string" &&
      typeof candidate.provider_id === "string"
  );

  if (validMatches.length !== result.matches.length) {
    console.warn("AI response contained invalid candidate records");
  }

  return {
    ...result,
    matches: validMatches,
  };
};

module.exports = { getAIMatches };
