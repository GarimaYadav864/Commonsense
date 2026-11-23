const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const {
  getDashboardStats,
} = require("../controllers/adminController");

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/dashboard", getDashboardStats);

module.exports = router;
