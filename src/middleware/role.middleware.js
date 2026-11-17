// Role-Based Access Control & Staff Assignment Verification Middleware
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const prisma = require('../config/prisma');
const { sendError } = require('../utils/response.util');

/**
 * Enforces user role restriction (e.g. STUDENT, STAFF, ADMIN).
 * @param  {...string} roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of the following roles: ${roles.join(', ')}`,
        403
      );
    }

    next();
  };
};

/**
 * Enforces that a STAFF user is explicitly assigned to manage the target queue.
 * Admins are authorized system-wide and automatically pass.
 */
const requireStaffQueueAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    // Administrators have system-wide supervisor access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (req.user.role !== 'STAFF') {
      return sendError(res, 'Only staff members can operate on queue counters', 403);
    }

    let targetQueueId = req.params.id;

    // If endpoint operates directly on an entry (e.g. /entries/:entryId/complete)
    if (!targetQueueId && req.params.entryId) {
      const entry = await prisma.queueEntry.findUnique({
        where: { id: req.params.entryId },
        select: { queueId: true },
      });
      if (!entry) {
        return sendError(res, 'Queue ticket entry not found', 404);
      }
      targetQueueId = entry.queueId;
      req.entryQueueId = targetQueueId;
    }

    if (!targetQueueId) {
      return sendError(res, 'Target queue ID not provided', 400);
    }

    // Verify explicit staff assignment in the database
    const assignment = await prisma.staffAssignment.findUnique({
      where: {
        userId_queueId: {
          userId: req.user.id,
          queueId: targetQueueId,
        },
      },
    });

    if (!assignment) {
      return sendError(
        res,
        'Unauthorized: You are not assigned to manage this queue counter.',
        403
      );
    }

    next();
  } catch (error) {
    console.error('Staff assignment check error:', error);
    return sendError(res, 'Failed to verify staff permissions', 500);
  }
};

module.exports = {
  requireRole,
  requireStaffQueueAssignment,
};
