const express = require("express");
const { getLocations, createLocation, deleteLocation } = require("../controllers/locationController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

// Every route in this file needs a logged-in user
router.use(requireAuth);

router.get("/", getLocations);                                  // any role
router.post("/", requireRole("ADMIN"), createLocation);         // admin only
router.delete("/:id", requireRole("ADMIN"), deleteLocation);    // admin only

module.exports = router;
