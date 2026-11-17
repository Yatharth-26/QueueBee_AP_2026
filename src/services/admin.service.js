// Admin Management Service
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const prisma = require('../config/prisma');

// ==========================================
// Locations Management
// ==========================================

const createLocation = async ({ name, building }) => {
  return await prisma.location.create({
    data: { name, building },
  });
};

const getAllLocations = async () => {
  return await prisma.location.findMany({
    include: {
      queues: {
        include: {
          _count: {
            select: {
              entries: { where: { status: 'WAITING' } },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};

const getLocationById = async (id) => {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      queues: true,
    },
  });

  if (!location) {
    const error = new Error('Location not found');
    error.statusCode = 404;
    throw error;
  }

  return location;
};

const updateLocation = async (id, { name, building }) => {
  return await prisma.location.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(building && { building }),
    },
  });
};

const deleteLocation = async (id) => {
  return await prisma.location.delete({
    where: { id },
  });
};

// ==========================================
// Queues Management
// ==========================================

const createQueue = async ({ locationId, name, maxSize, avgServiceSeconds }) => {
  return await prisma.queue.create({
    data: {
      locationId,
      name,
      maxSize: maxSize || 100,
      avgServiceSeconds: avgServiceSeconds || 300,
      status: 'OPEN',
      nextTicketNo: 1,
    },
    include: {
      location: true,
    },
  });
};

const getAllQueues = async () => {
  const queues = await prisma.queue.findMany({
    include: {
      location: true,
      staffAssignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: {
          entries: { where: { status: 'WAITING' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return queues.map((q) => ({
    ...q,
    waitingCount: q._count.entries,
  }));
};

const getQueueById = async (id) => {
  const queue = await prisma.queue.findUnique({
    where: { id },
    include: {
      location: true,
      staffAssignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: {
          entries: true,
        },
      },
    },
  });

  if (!queue) {
    const error = new Error('Queue not found');
    error.statusCode = 404;
    throw error;
  }

  return queue;
};

const updateQueue = async (id, data) => {
  return await prisma.queue.update({
    where: { id },
    data,
    include: { location: true },
  });
};

const deleteQueue = async (id) => {
  return await prisma.queue.delete({
    where: { id },
  });
};

// ==========================================
// Staff Assignments
// ==========================================

const assignStaffToQueue = async ({ userId, queueId }) => {
  // Verify user has STAFF role
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || (user.role !== 'STAFF' && user.role !== 'ADMIN')) {
    const error = new Error('User must have STAFF or ADMIN role to be assigned to a counter');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.staffAssignment.upsert({
    where: {
      userId_queueId: { userId, queueId },
    },
    update: {},
    create: { userId, queueId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      queue: { select: { id: true, name: true } },
    },
  });
};

const removeStaffAssignment = async ({ userId, queueId }) => {
  return await prisma.staffAssignment.delete({
    where: {
      userId_queueId: { userId, queueId },
    },
  });
};

const getAllUsers = async (role = null) => {
  return await prisma.user.findMany({
    where: role ? { role } : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  createQueue,
  getAllQueues,
  getQueueById,
  updateQueue,
  deleteQueue,
  assignStaffToQueue,
  removeStaffAssignment,
  getAllUsers,
};
