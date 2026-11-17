// Queue Validation Schemas
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const { z } = require('zod');

const createQueueSchema = z.object({
  locationId: z.string().uuid('Invalid location ID format'),
  name: z.string().trim().min(2, 'Queue name must be at least 2 characters').max(100),
  maxSize: z.number().int().min(1, 'Max size must be at least 1').default(100),
  avgServiceSeconds: z.number().int().min(10, 'Average service seconds must be at least 10').default(300),
});

const updateQueueSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  status: z.enum(['OPEN', 'PAUSED', 'CLOSED']).optional(),
  maxSize: z.number().int().min(1).optional(),
  avgServiceSeconds: z.number().int().min(10).optional(),
});

const queueIdParamSchema = z.object({
  id: z.string().uuid('Invalid queue ID format'),
});

const entryIdParamSchema = z.object({
  entryId: z.string().uuid('Invalid entry ID format'),
});

module.exports = {
  createQueueSchema,
  updateQueueSchema,
  queueIdParamSchema,
  entryIdParamSchema,
};
