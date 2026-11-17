// Location Controller
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/response.util');

const getAllLocations = async (req, res, next) => {
  try {
    const locations = await adminService.getAllLocations();
    return sendSuccess(res, locations, 'Locations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getLocationById = async (req, res, next) => {
  try {
    const location = await adminService.getLocationById(req.params.id);
    return sendSuccess(res, location, 'Location details retrieved');
  } catch (error) {
    next(error);
  }
};

const createLocation = async (req, res, next) => {
  try {
    const { name, building } = req.body;
    const location = await adminService.createLocation({ name, building });
    return sendSuccess(res, location, 'Location created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const location = await adminService.updateLocation(req.params.id, req.body);
    return sendSuccess(res, location, 'Location updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteLocation = async (req, res, next) => {
  try {
    await adminService.deleteLocation(req.params.id);
    return sendSuccess(res, null, 'Location deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
};
