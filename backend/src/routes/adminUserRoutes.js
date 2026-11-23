
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getAllUsers } = require("../controllers/adminUserController");

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/", getAllUsers);

module.exports = router;
