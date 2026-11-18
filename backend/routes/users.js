const express = require("express");
const { listUsers, setRole } = require("../controllers/users");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// User management is admin-only.
router.use(protect, authorize("admin"));
router.route("/").get(listUsers);
router.route("/:id/role").put(setRole);

module.exports = router;