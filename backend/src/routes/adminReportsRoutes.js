
const express = require("express");
const router = express.Router();

const { getAdminReports } = require("../controllers/adminReportsController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/", getAdminReports);

module.exports = router;
