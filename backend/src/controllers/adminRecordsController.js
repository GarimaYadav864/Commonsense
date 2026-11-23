
const Request = require("../models/Request");
const Resource = require("../models/Resource");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(query.limit, 10) || 10)
  );

  return { page, limit, skip: (page - 1) * limit };
};

const getAdminRequests = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, status, category, location } = req.query;

    const allowedStatuses = [
      "pending",
      "matching",
      "offered",
      "fulfilled",
      "cancelled",
    ];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status",
      });
    }

    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category.toLowerCase().trim();

    if (location) {
      filter.location = {
        $regex: escapeRegex(location.trim()),
        $options: "i",
      };
    }

    if (search) {
      const searchRegex = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };

      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { location: searchRegex },
      ];
    }

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .select("-__v")
        .populate("requester", "name email location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Request.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      records: requests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin get requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch requests",
    });
  }
};

const getAdminResources = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, status, category, location } = req.query;

    const allowedStatuses = ["available", "unavailable", "fulfilled"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource status",
      });
    }

    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category.toLowerCase().trim();

    if (location) {
      filter.location = {
        $regex: escapeRegex(location.trim()),
        $options: "i",
      };
    }

    if (search) {
      const searchRegex = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };

      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { location: searchRegex },
      ];
    }

    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .select("-__v")
        .populate("provider", "name email location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Resource.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      records: resources,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin get resources error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch resources",
    });
  }
};

module.exports = {
  getAdminRequests,
  getAdminResources,
};
