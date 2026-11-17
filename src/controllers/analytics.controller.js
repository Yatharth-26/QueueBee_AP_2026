// Analytics Controller
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/response.util');

const getOverview = async (req, res, next) => {
  try {
    const stats = await analyticsService.getSystemOverviewStats();
    return sendSuccess(res, stats, 'System overview statistics retrieved');
  } catch (error) {
    next(error);
  }
};

const getQueueStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getQueueAnalytics();
    return sendSuccess(res, stats, 'Queue analytics retrieved');
  } catch (error) {
    next(error);
  }
};

const getHourlyStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getHourlyActivity();
    return sendSuccess(res, stats, 'Hourly queue activity retrieved');
  } catch (error) {
    next(error);
  }
};

const syncHourlyTable = async (req, res, next) => {
  try {
    await analyticsService.syncHourlyStatsTable();
    return sendSuccess(res, null, 'Hourly statistics synchronized');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getQueueStats,
  getHourlyStats,
  syncHourlyTable,
};
