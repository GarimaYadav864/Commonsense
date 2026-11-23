
const express = require("express");
const router = express.Router();

const {
  createDelivery,
  getMyDeliveries,
  getAvailableDeliveries,
  claimDelivery,
  markDispatched,
  confirmReceipt,
} = require("../controllers/deliveryController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(protect);

// Requester creates a delivery arrangement
router.post(
  "/",
  authorizeRoles("requester"),
  createDelivery
);

// Volunteer views unassigned community deliveries
router.get(
  "/available",
  authorizeRoles("volunteer"),
  getAvailableDeliveries
);

// Provider, requester and volunteer view their deliveries
router.get(
  "/my",
  authorizeRoles("requester", "provider", "volunteer"),
  getMyDeliveries
);

// Volunteer claims a community delivery
router.patch(
  "/:id/claim",
  authorizeRoles("volunteer"),
  claimDelivery
);

// Provider dispatches the resource
router.patch(
  "/:id/dispatch",
  authorizeRoles("provider"),
  markDispatched
);

// Requester confirms receipt
router.patch(
  "/:id/confirm-receipt",
  authorizeRoles("requester"),
  confirmReceipt
);

module.exports = router;
