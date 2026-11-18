const express = require("express");
const {
  joinQueue,
  getMyTicket,
  cancelMyTicket,
  getMyHistory,
  getLocationQueue,
  callNextTicket,
  completeTicket,
} = require("../controllers/queueController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.use(requireAuth);

// Student routes
router.post("/join", requireRole("STUDENT"), joinQueue);
router.get("/my-ticket", requireRole("STUDENT"), getMyTicket);
router.post("/cancel", requireRole("STUDENT"), cancelMyTicket);
router.get("/history", requireRole("STUDENT"), getMyHistory);

// Staff routes (admin is allowed too)
router.get("/location/:locationId", requireRole("STAFF", "ADMIN"), getLocationQueue);
router.post("/location/:locationId/call-next", requireRole("STAFF", "ADMIN"), callNextTicket);
router.post("/tickets/:ticketId/complete", requireRole("STAFF", "ADMIN"), completeTicket);

module.exports = router;
