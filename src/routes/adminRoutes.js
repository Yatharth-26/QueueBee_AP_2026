const express = require("express");
const { getStats, getUsers, changeUserRole } = require("../controllers/adminController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

// Every admin route needs: logged in + ADMIN role
router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.get("/stats", getStats);
router.get("/users", getUsers);
router.patch("/users/:id/role", changeUserRole);

module.exports = router;
