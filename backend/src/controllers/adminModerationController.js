
const mongoose = require("mongoose");
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const AdminAuditLog = require("../models/AdminAuditLog");

const cancelRequestByAdmin = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A moderation reason is required",
      });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (["fulfilled", "cancelled"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: "This request cannot be cancelled",
      });
    }

    const previousStatus = request.status;

    request.status = "cancelled";
    await request.save();

    await AdminAuditLog.create({
      admin: req.user._id,
      action: "REQUEST_CANCELLED",
      targetType: "Request",
      targetId: request._id,
      reason: reason.trim(),
      previousStatus,
      newStatus: request.status,
    });

    return res.status(200).json({
      success: true,
      message: "Request cancelled by admin",
      request,
    });
  } catch (error) {
    console.error("Admin cancel request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to moderate request",
    });
  }
};

const updateResourceStatusByAdmin = async (req, res) => {
  try {
    const { status, reason } = req.body;

    const allowedStatuses = ["available", "unavailable"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource status",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A moderation reason is required",
      });
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (resource.status === "fulfilled") {
      return res.status(400).json({
        success: false,
        message: "Fulfilled resources cannot be moderated",
      });
    }

    const previousStatus = resource.status;

    if (previousStatus === status) {
      return res.status(400).json({
        success: false,
        message: "Resource already has this status",
      });
    }

    resource.status = status;
    await resource.save();

    await AdminAuditLog.create({
      admin: req.user._id,
      action: "RESOURCE_STATUS_CHANGED",
      targetType: "Resource",
      targetId: resource._id,
      reason: reason.trim(),
      previousStatus,
      newStatus: resource.status,
    });

    return res.status(200).json({
      success: true,
      message: "Resource status updated",
      resource,
    });
  } catch (error) {
    console.error("Admin resource moderation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to moderate resource",
    });
  }
};

const getAdminAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const [logs, total] = await Promise.all([
      AdminAuditLog.find()
        .populate("admin", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      AdminAuditLog.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin audit logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch audit logs",
    });
  }
};

module.exports = {
  cancelRequestByAdmin,
  updateResourceStatusByAdmin,
  getAdminAuditLogs,
};

