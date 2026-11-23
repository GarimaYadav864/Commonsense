
const { notifyAdmins } = require("../services/notificationService");
const Request = require("../models/Request");

// CREATE REQUEST
const createRequest = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      quantity,
      unit,
      location,
      latitude,
      longitude,
      urgency,
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      quantity === undefined ||
      !unit ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
    }

    const allowedUrgencies = ["low", "medium", "high", "critical"];

    if (urgency && !allowedUrgencies.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid urgency level",
      });
    }

    // Validate optional coordinates.
    if (
      (latitude !== undefined && longitude === undefined) ||
      (longitude !== undefined && latitude === undefined)
    ) {
      return res.status(400).json({
        success: false,
        message: "Both latitude and longitude are required together",
      });
    }

    if (
      latitude !== undefined &&
      (!Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
    }

    const request = await Request.create({
      title,
      description,
      category,
      quantity,
      unit,
      location,
      latitude,
      longitude,
      urgency: urgency || "medium",
      requester: req.user._id,
    });

    // Notify admins about the newly created request.
    await notifyAdmins(req.app.get("io"), {
      type: "admin_new_request",
      title: "New community request",
      message: `A new request "${request.title}" was submitted.`,
      relatedId: request._id,
      relatedModel: "Request",
    });

    return res.status(201).json({
      success: true,
      message: "Resource request created successfully",
      request,
    });
  } catch (error) {
    console.error("Create request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create request",
    });
  }
};


// GET ALL REQUESTS
const getRequests = async (req, res) => {
  try {
    const filter = {};

    // Requesters see their own requests.
    // Providers and volunteers can browse pending requests.
    if (req.user.role === "requester") {
      filter.requester = req.user._id;
    } else {
      filter.status = { $in: ["pending", "matching"] };
    }

    const requests = await Request.find(filter)
      .populate("requester", "name location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch requests",
    });
  }
};


// GET MY REQUESTS
const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      requester: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get my requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your requests",
    });
  }
};


// CANCEL MY REQUEST

const cancelRequest = async (req, res) => {
  try {
    const request = await Request.findOneAndUpdate(
      {
        _id: req.params.id,
        requester: req.user._id,
        status: { $in: ["pending", "matching"] },
      },
      {
        $set: { status: "cancelled" },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!request) {
      const existingRequest = await Request.findOne({
        _id: req.params.id,
        requester: req.user._id,
      }).select("status");

      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }

      return res.status(409).json({
        success: false,
        message: "This request can no longer be cancelled",
        currentStatus: existingRequest.status,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Request cancelled successfully",
      request,
    });
  } catch (error) {
    console.error("Cancel request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel request",
    });
  }
};



module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  cancelRequest,
};
