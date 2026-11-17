// Admin Validation Schemas
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const { z } = require('zod');

const createLocationSchema = z.object({
  name: z.string().trim().min(2, 'Location name must be at least 2 characters').max(100),
  building: z.string().trim().min(2, 'Building name must be at least 2 characters').max(100),
});

const updateLocationSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  building: z.string().trim().min(2).max(100).optional(),
});

const assignStaffSchema = z.object({
  userId: z.string().uuid('Invalid staff user ID format'),
  queueId: z.string().uuid('Invalid queue ID format'),
});

module.exports = {
  createLocationSchema,
  updateLocationSchema,
  assignStaffSchema,
};
