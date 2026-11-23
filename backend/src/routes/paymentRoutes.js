const express = require("express");
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  getMyPayments,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(protect, authorizeRoles("requester"));
router.post("/orders", createPaymentOrder);
router.post("/verify", verifyPayment);
router.get("/my", getMyPayments);

module.exports = router;
