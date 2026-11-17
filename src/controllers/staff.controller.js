// Staff Queue Operations Controller
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const staffService = require('../services/staff.service');
const { sendSuccess } = require('../utils/response.util');

const getAssignedQueues = async (req, res, next) => {
  try {
    const queues = await staffService.getAssignedQueues(req.user.id);
    return sendSuccess(res, queues, 'Assigned queues retrieved');
  } catch (error) {
    next(error);
  }
};

const getQueueEntries = async (req, res, next) => {
  try {
    const data = await staffService.getQueueEntriesForStaff(req.params.id);
    return sendSuccess(res, data, 'Queue entries retrieved');
  } catch (error) {
    next(error);
  }
};

const callNext = async (req, res, next) => {
  try {
    const entry = await staffService.callNextStudent(req.params.id, req.user.id);
    return sendSuccess(res, entry, `Ticket #${entry.ticketNo} called to counter`);
  } catch (error) {
    next(error);
  }
};

const completeEntry = async (req, res, next) => {
  try {
    const result = await staffService.completeService(req.params.entryId, req.user.id);
    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const markNoShow = async (req, res, next) => {
  try {
    const result = await staffService.markNoShow(req.params.entryId, req.user.id);
    return sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const pauseQueue = async (req, res, next) => {
  try {
    const queue = await staffService.updateQueueStatus(req.params.id, 'PAUSED');
    return sendSuccess(res, queue, 'Queue paused. New student joins are disabled.');
  } catch (error) {
    next(error);
  }
};

const resumeQueue = async (req, res, next) => {
  try {
    const queue = await staffService.updateQueueStatus(req.params.id, 'OPEN');
    return sendSuccess(res, queue, 'Queue resumed. Accepting student entries.');
  } catch (error) {
    next(error);
  }
};

const closeQueue = async (req, res, next) => {
  try {
    const queue = await staffService.updateQueueStatus(req.params.id, 'CLOSED');
    return sendSuccess(res, queue, 'Queue closed for the day.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedQueues,
  getQueueEntries,
  callNext,
  completeEntry,
  markNoShow,
  pauseQueue,
  resumeQueue,
  closeQueue,
};
