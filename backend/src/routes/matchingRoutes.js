
const express = require("express");
const router = express.Router();

const { getMatches } = require("../controllers/matchingController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.post(
  "/:requestId",
  protect,
  authorizeRoles("requester"),
  getMatches
);

module.exports = router;

