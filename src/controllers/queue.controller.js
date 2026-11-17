// Queue Operations Controller (Students & General Public)
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const queueService = require('../services/queue.service');
const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/response.util');

const getAllQueues = async (req, res, next) => {
  try {
    const queues = await adminService.getAllQueues();
    return sendSuccess(res, queues, 'Queues retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getQueueById = async (req, res, next) => {
  try {
    const queue = await adminService.getQueueById(req.params.id);
    return sendSuccess(res, queue, 'Queue retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createQueue = async (req, res, next) => {
  try {
    const queue = await adminService.createQueue(req.body);
    return sendSuccess(res, queue, 'Queue created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateQueue = async (req, res, next) => {
  try {
    const queue = await adminService.updateQueue(req.params.id, req.body);
    return sendSuccess(res, queue, 'Queue updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteQueue = async (req, res, next) => {
  try {
    await adminService.deleteQueue(req.params.id);
    return sendSuccess(res, null, 'Queue deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Student Queue Operations
// ==========================================

const joinQueue = async (req, res, next) => {
  try {
    const queueId = req.params.id;
    const userId = req.user.id;
    const ticket = await queueService.joinQueue(queueId, userId);
    return sendSuccess(res, ticket, 'Successfully joined the virtual queue!', 201);
  } catch (error) {
    next(error);
  }
};

const leaveQueue = async (req, res, next) => {
  try {
    const queueId = req.params.id;
    const userId = req.user.id;
    const result = await queueService.leaveQueue(queueId, userId);
    return sendSuccess(res, result, 'Successfully left the queue');
  } catch (error) {
    next(error);
  }
};

const getMyPosition = async (req, res, next) => {
  try {
    const queueId = req.params.id;
    const userId = req.user.id;
    const position = await queueService.getMyPosition(queueId, userId);
    if (!position) {
      return sendSuccess(res, null, 'No active queue ticket found for this queue');
    }
    return sendSuccess(res, position, 'Queue position retrieved');
  } catch (error) {
    next(error);
  }
};

const getQueueStatus = async (req, res, next) => {
  try {
    const status = await queueService.getQueuePublicStatus(req.params.id);
    return sendSuccess(res, status, 'Queue public status retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllQueues,
  getQueueById,
  createQueue,
  updateQueue,
  deleteQueue,
  joinQueue,
  leaveQueue,
  getMyPosition,
  getQueueStatus,
};
