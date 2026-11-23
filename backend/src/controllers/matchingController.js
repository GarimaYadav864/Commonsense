
const Request = require("../models/Request");
const { getAIMatches } = require("../services/aiMatchingService");

const getMatches = async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.requestId,
      requester: req.user._id,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (!["pending", "matching"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: "This request is not eligible for matching",
      });
    }

    const result = await getAIMatches(request);

    return res.status(200).json({
      success: true,
      message: result.message,
      requestId: result.request_id,
      totalMatches: result.total_matches,
      matches: result.matches,
    });
  } catch (error) {
    console.error("AI matching error:", error);

    return res.status(502).json({
      success: false,
      message: "AI matching service is unavailable",
    });
  }
};

module.exports = { getMatches };
