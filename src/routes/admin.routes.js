// Admin Management & Analytics Routes
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const analyticsController = require('../controllers/analytics.controller');
const locationController = require('../controllers/location.controller');
const queueController = require('../controllers/queue.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createLocationSchema, assignStaffSchema } = require('../validators/admin.validator');
const { createQueueSchema } = require('../validators/queue.validator');

// All admin routes require ADMIN role
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// Entity Management
router.post('/locations', validate(createLocationSchema), locationController.createLocation);
router.post('/queues', validate(createQueueSchema), queueController.createQueue);
router.post('/assignments', validate(assignStaffSchema), adminController.assignStaff);
router.delete('/assignments', validate(assignStaffSchema), adminController.removeStaff);
router.get('/users', adminController.getUsers);

// Analytics & Reports
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/queues', analyticsController.getQueueStats);
router.get('/analytics/hourly', analyticsController.getHourlyStats);
router.post('/analytics/sync', analyticsController.syncHourlyTable);

module.exports = router;
