const express = require("express");
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  getMyPayments,
  getProviderContributions,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(protect);
router.post("/orders", authorizeRoles("requester"), createPaymentOrder);
router.post("/verify", authorizeRoles("requester"), verifyPayment);
router.get("/my", authorizeRoles("requester"), getMyPayments);
router.get("/provider/contributions", authorizeRoles("provider"), getProviderContributions);

module.exports = router;
