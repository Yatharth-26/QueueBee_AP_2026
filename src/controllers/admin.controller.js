// Administrator Controller
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/response.util');

const assignStaff = async (req, res, next) => {
  try {
    const { userId, queueId } = req.body;
    const assignment = await adminService.assignStaffToQueue({ userId, queueId });
    return sendSuccess(res, assignment, 'Staff assigned to queue successfully', 201);
  } catch (error) {
    next(error);
  }
};

const removeStaff = async (req, res, next) => {
  try {
    const { userId, queueId } = req.body;
    await adminService.removeStaffAssignment({ userId, queueId });
    return sendSuccess(res, null, 'Staff assignment removed');
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const users = await adminService.getAllUsers(role);
    return sendSuccess(res, users, 'Users retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignStaff,
  removeStaff,
  getUsers,
};
