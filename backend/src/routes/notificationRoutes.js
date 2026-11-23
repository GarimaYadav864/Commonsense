const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getMyNotifications);

// Keep this route before /:id/read.
router.patch("/read-all", markAllAsRead);

router.patch("/:id/read", markAsRead);

router.delete("/:id", deleteNotification);

module.exports = router;

