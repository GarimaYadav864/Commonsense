
const express = require("express");
const router = express.Router();

const {
  createRequest,
  getRequests,
  getMyRequests,
  cancelRequest,
} = require("../controllers/requestController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All request routes require authentication
router.use(protect);

// Browse requests
router.get("/", getRequests);

// View own requests
router.get("/my", authorizeRoles("requester"), getMyRequests);

// Create a request
router.post(
  "/",
  authorizeRoles("requester"),
  createRequest
);

// Cancel own request
router.patch(
  "/:id/cancel",
  authorizeRoles("requester"),
  cancelRequest
);

module.exports = router;

