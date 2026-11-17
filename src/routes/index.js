// Central API Router
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const locationRoutes = require('./location.routes');
const queueRoutes = require('./queue.routes');
const staffRoutes = require('./staff.routes');
const adminRoutes = require('./admin.routes');

// Health Check Endpoint (Phase 1)
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Smart Queue (QueueBee) API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Mount Resource Routes
router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/queues', queueRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
