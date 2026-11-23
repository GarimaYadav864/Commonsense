
const User = require("../models/User");

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const { role, search } = req.query;

    const filter = {};

    // Only accept valid role filters.
    const allowedRoles = ["requester", "provider", "volunteer", "admin"];

    if (role && role !== "all") {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role filter",
        });
      }

      filter.role = role;
    }

    // Escape regex special characters in user input.
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { location: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("_id name email role location createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit,
      },
    });
  } catch (error) {
    console.error("Admin get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch users",
    });
  }
};

module.exports = { getAllUsers };
