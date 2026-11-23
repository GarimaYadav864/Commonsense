const User = require("../models/User");
const Notification = require("../models/Notification");

// Create and save a notification, then emit it through Socket.IO.
const createNotification = async ({
  io,
  recipient,
  type,
  title,
  message,
  relatedId = null,
  relatedModel = null,
}) => {
  if (!recipient) return null;

  const notification = await Notification.create({
    recipient,
    type,
    title,
    message,
    relatedId,
    relatedModel,
  });

  const payload = notification.toObject();

  if (io) {
    io.to(`user:${recipient.toString()}`).emit(
      "notification",
      payload
    );
  }

  return notification;
};

// Safe notification helper.
// Notification failure must not break the main business operation.
const notifySafely = async (io, notificationData) => {
  try {
    return await createNotification({
      io,
      ...notificationData,
    });
  } catch (error) {
    console.error(
      "Notification creation failed:",
      error.message
    );

    return null;
  }
};

// Backward-compatible helper for the existing offerController.
// Existing calls use sendNotification(io, notificationData).
const sendNotification = async (io, notificationData) => {
  return notifySafely(io, {
    ...notificationData,
    relatedModel:
      notificationData.relatedModel || "Offer",
  });
};

// Multiple notifications can be attempted without blocking
// the successful delivery or offer operation.
const sendNotifications = async (io, notifications) => {
  return Promise.all(
    notifications.map((notification) =>
      notifySafely(io, notification)
    )
  );
};


const notifyAdmins = async (io, notificationData) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");

    return await Promise.all(
      admins.map((admin) =>
        notifySafely(io, {
          ...notificationData,
          recipient: admin._id,
        })
      )
    );
  } catch (error) {
    console.error("Admin notification failed:", error.message);
    return [];
  }
};

 
// Notify every registered user except the person who created the request.
const notifyCommunityUsers = async (io, notificationData, excludeUserId) => {
  try {
    const filter = excludeUserId ? { _id: { $ne: excludeUserId } } : {};
    const users = await User.find(filter).select("_id");

    return await Promise.all(
      users.map((user) =>
        notifySafely(io, {
          ...notificationData,
          recipient: user._id,
        })
      )
    );
  } catch (error) {
    console.error("Community notification failed:", error.message);
    return [];
  }
};

module.exports = {
  createNotification,
  notifySafely,
  sendNotification,
  sendNotifications,
  notifyAdmins,
  notifyCommunityUsers,
};
