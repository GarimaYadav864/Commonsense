
const express = require("express");
const router = express.Router();

const {
  startOfferProcess,
  respondToOffer,
  getMyOffers,
  getMyProviderOffers,
  getMyRequesterOffers,
  confirmOffer,
  cancelOffer,
} = require("../controllers/offerController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All offer routes require authentication
router.use(protect);

// Requester starts sequential matching
router.post(
  "/start/:requestId",
  authorizeRoles("requester"),
  startOfferProcess
);

// Provider views pending offers
router.get(
  "/my",
  authorizeRoles("provider"),
  getMyOffers
);

// Provider accepts or rejects an offer
router.patch(
  "/:offerId/respond",
  authorizeRoles("provider"),
  respondToOffer
);

// Requester confirms an accepted offer
router.patch(
  "/:offerId/confirm",
  authorizeRoles("requester"),
  confirmOffer
);

// Requester cancels an offer
router.patch(
  "/:offerId/cancel",
  authorizeRoles("requester"),
  cancelOffer
);

router.get(
  "/provider/my",
  authorizeRoles("provider"),
  getMyProviderOffers
);

router.get("/requester/my", protect, getMyRequesterOffers);

module.exports = router;
