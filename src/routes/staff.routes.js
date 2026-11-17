// Staff Counter Routes
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole, requireStaffQueueAssignment } = require('../middleware/role.middleware');

// All staff routes require authentication and STAFF or ADMIN role
router.use(requireAuth);
router.use(requireRole('STAFF', 'ADMIN'));

// List assigned queues for current staff member
router.get('/queues', staffController.getAssignedQueues);

// View queue waiting entries & currently called student
router.get('/queues/:id/entries', requireStaffQueueAssignment, staffController.getQueueEntries);

// Concurrency-Safe Call Next Student
router.post('/queues/:id/call-next', requireStaffQueueAssignment, staffController.callNext);

// Complete service for called student ticket
router.post('/entries/:entryId/complete', requireStaffQueueAssignment, staffController.completeEntry);

// Mark called student as no-show
router.post('/entries/:entryId/no-show', requireStaffQueueAssignment, staffController.markNoShow);

// Queue operational controls (Pause / Resume / Close)
router.patch('/queues/:id/pause', requireStaffQueueAssignment, staffController.pauseQueue);
router.patch('/queues/:id/resume', requireStaffQueueAssignment, staffController.resumeQueue);
router.patch('/queues/:id/close', requireStaffQueueAssignment, staffController.closeQueue);

module.exports = router;
