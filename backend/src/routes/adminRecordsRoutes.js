
const express = require("express");
const router = express.Router();

const {
  getAdminRequests,
  getAdminResources,
} = require("../controllers/adminRecordsController");

// Correct named imports
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Authentication and admin authorization
router.use(protect);
router.use(authorizeRoles("admin"));

// Admin records routes
router.get("/requests", getAdminRequests);
router.get("/resources", getAdminResources);

module.exports = router;

