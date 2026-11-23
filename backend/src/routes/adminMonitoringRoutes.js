
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const {
  getMonitoringOverview,
} = require("../controllers/adminMonitoringController");

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/overview", getMonitoringOverview);

module.exports = router;
