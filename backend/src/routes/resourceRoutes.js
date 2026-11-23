
const express = require("express");
const router = express.Router();

const {
  createResource,
  getResources,
  getMyResources,
  updateResource,
  deleteResource,
} = require("../controllers/resourceController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Browse available resources (logged-in users)
router.get("/", protect, getResources);

// Provider's own resources
router.get("/my", protect, authorizeRoles("provider"), getMyResources);

// Create resource
router.post("/", protect, authorizeRoles("provider"), createResource);

// Update resource
router.patch("/:id", protect, authorizeRoles("provider"), updateResource);

// Delete resource
router.delete("/:id", protect, authorizeRoles("provider"), deleteResource);

module.exports = router;

