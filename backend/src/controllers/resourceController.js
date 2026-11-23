
const Resource = require("../models/Resource");
const { notifyAdmins } = require("../services/notificationService");
const Offer = require("../models/Offer");
const Delivery = require("../models/Delivery");
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// CREATE RESOURCE
const createResource = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      quantity,
      unit,
      condition,
      location,
      latitude,
      longitude,
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

    const resource = await Resource.create({
      title,
      description,
      category,
      quantity,
      unit,
      condition,
      location,
      latitude,
      longitude,
      provider: req.user._id,
      status: "available",
      providerAvailability: "active",
    });

    await notifyAdmins(req.app.get("io"), {
      type: "admin_new_resource",
      title: "New resource listed",
      message: `A new resource "${resource.title}" was added to Commonsense.`,
      relatedId: resource._id,
      relatedModel: "Resource",
    });

    return res.status(201).json({
      success: true,
      message: "Resource created successfully",
      resource,
    });
  } catch (error) {
    console.error("Create resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create resource",
    });
  }
};


// GET ALL AVAILABLE RESOURCES

const getResources = async (req, res) => {
  try {
    const { category, location, search } = req.query;

    const filter = {
      status: "available",
      providerAvailability: { $ne: "paused" },
      quantity: { $gt: 0 },
    };

    if (category) {
      filter.category = String(category).toLowerCase().trim();
    }

    if (location) {
      const safeLocation = escapeRegex(String(location).trim());

      filter.location = {
        $regex: safeLocation,
        $options: "i",
      };
    }

    if (search) {
      const safeSearch = escapeRegex(String(search).trim());

      filter.$or = [
        {
          title: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const resources = await Resource.find(filter)
      .populate("provider", "name location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("Get resources error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch resources",
    });
  }
};



// GET PROVIDER'S OWN RESOURCES
const getMyResources = async (req, res) => {
  try {
    const resources = await Resource.find({
      provider: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("Get my resources error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your resources",
    });
  }
};


// UPDATE RESOURCE
const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findOne({
      _id: req.params.id,
      provider: req.user._id,
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found or access denied",
      });
    }

    // Providers can update listing details and their listing preference.
    // Inventory status is controlled by stock and fulfilment logic.
    const allowedFields = [
      "title",
      "description",
      "category",
      "quantity",
      "unit",
      "condition",
      "location",
      "latitude",
      "longitude",
      "providerAvailability",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        resource[field] = req.body[field];
      }
    }

    if (
      !["active", "paused"].includes(resource.providerAvailability)
    ) {
      return res.status(400).json({
        success: false,
        message: "providerAvailability must be active or paused",
      });
    }

    
    if (
      !Number.isFinite(resource.quantity) ||
      resource.quantity < 0 ||
      (resource.quantity > 0 && resource.quantity < 0.01)
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be zero or at least 0.01",
      });
    }


    // Derive inventory status from stock.
    // Never overwrite fulfilled status.
    if (resource.status !== "fulfilled") {
      resource.status =
        resource.quantity > 0 ? "available" : "unavailable";
    }

    const hasLatitude = resource.latitude != null;
    const hasLongitude = resource.longitude != null;

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        success: false,
        message: "Both latitude and longitude are required together",
      });
    }

    if (
      hasLatitude &&
      (!Number.isFinite(resource.latitude) ||
        resource.latitude < -90 ||
        resource.latitude > 90 ||
        !Number.isFinite(resource.longitude) ||
        resource.longitude < -180 ||
        resource.longitude > 180)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
    }

    await resource.save();

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      resource,
    });
  } catch (error) {
    console.error("Update resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update resource",
    });
  }
};


// DELETE RESOURCE

const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findOne({
      _id: req.params.id,
      provider: req.user._id,
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found or access denied",
      });
    }

    // Preserve offer and delivery history.
    const [existingOffer, existingDelivery] = await Promise.all([
      Offer.exists({ resource: resource._id }),
      Delivery.exists({ offer: { $in: await Offer.find({
        resource: resource._id,
      }).distinct("_id") } }),
    ]);

    if (existingOffer || existingDelivery) {
      return res.status(409).json({
        success: false,
        message:
          "This resource is linked to offer history and cannot be deleted. Pause it instead.",
      });
    }

    await Resource.deleteOne({
      _id: resource._id,
      provider: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("Delete resource error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete resource",
    });
  }
};



module.exports = {
  createResource,
  getResources,
  getMyResources,
  updateResource,
  deleteResource,
};
