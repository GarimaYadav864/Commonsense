
const express = require("express");
const router = express.Router();

const {
  cancelRequestByAdmin,
  updateResourceStatusByAdmin,
  getAdminAuditLogs,
} = require("../controllers/adminModerationController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(protect);
router.use(authorizeRoles("admin"));

router.patch("/requests/:id/cancel", cancelRequestByAdmin);

router.patch("/resources/:id/status", updateResourceStatusByAdmin);

router.get("/audit-logs", getAdminAuditLogs);

module.exports = router;
