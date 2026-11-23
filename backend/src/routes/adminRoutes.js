const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const {
  getDashboardStats,
} = require("../controllers/adminController");
const { getDamageDisputes, resolveDamageDispute } = require("../controllers/disputeController");

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/disputes", getDamageDisputes);
router.patch("/disputes/:id/resolve", resolveDamageDispute);

module.exports = router;
