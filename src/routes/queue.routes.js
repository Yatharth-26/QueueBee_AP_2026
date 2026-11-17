// Queue Routes
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createQueueSchema, updateQueueSchema } = require('../validators/queue.validator');

// Public / Authenticated read routes
router.get('/', queueController.getAllQueues);
router.get('/:id', queueController.getQueueById);
router.get('/:id/status', queueController.getQueueStatus);

// Student queue interactions (Protected)
router.post('/:id/join', requireAuth, queueController.joinQueue);
router.post('/:id/leave', requireAuth, queueController.leaveQueue);
router.get('/:id/my-position', requireAuth, queueController.getMyPosition);

// Admin-only queue CRUD
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createQueueSchema),
  queueController.createQueue
);
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateQueueSchema),
  queueController.updateQueue
);
router.delete('/:id', requireAuth, requireRole('ADMIN'), queueController.deleteQueue);

module.exports = router;
