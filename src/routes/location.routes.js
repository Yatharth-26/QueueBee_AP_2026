// Location Routes
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createLocationSchema, updateLocationSchema } = require('../validators/admin.validator');

// Public / Authenticated read routes
router.get('/', locationController.getAllLocations);
router.get('/:id', locationController.getLocationById);

// Admin-only management routes
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createLocationSchema),
  locationController.createLocation
);
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateLocationSchema),
  locationController.updateLocation
);
router.delete('/:id', requireAuth, requireRole('ADMIN'), locationController.deleteLocation);

module.exports = router;
