const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const Anomaly = require('../models/Anomaly');

// GET /api/stats - Retrieve aggregated statistics for dashboard
router.get('/', async (req, res, next) => {
  try {
    const { apiKey } = req.query;
    const filter = {};
    if (apiKey) {
      filter.apiKey = apiKey;
    }

    // 1. Unresolved anomalies count
    const activeAnomaliesCount = await Anomaly.countDocuments({
      ...filter,
      resolved: false
    });

    // 2. Count by severity level
    const levelCountsRaw = await Log.aggregate([
      { $match: filter },
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]);
    
    const levelCounts = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
    levelCountsRaw.forEach(item => {
      if (levelCounts.hasOwnProperty(item._id)) {
        levelCounts[item._id] = item.count;
      }
    });

    const totalLogs = Object.values(levelCounts).reduce((a, b) => a + b, 0);
    const totalErrors = levelCounts.ERROR + levelCounts.FATAL;
    const errorRate = totalLogs > 0 ? ((totalErrors / totalLogs) * 100).toFixed(2) : '0.00';

    // 3. Log volume per service
    const serviceCounts = await Log.aggregate([
      { $match: filter },
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // 4. Log frequency over time (last 24 hours, grouped by hour)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hourlyLogs = await Log.aggregate([
      { 
        $match: { 
          ...filter,
          timestamp: { $gte: twentyFourHoursAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          INFO: { $sum: { $cond: [{ $eq: ['$level', 'INFO'] }, 1, 0] } },
          WARN: { $sum: { $cond: [{ $eq: ['$level', 'WARN'] }, 1, 0] } },
          ERROR: { $sum: { $cond: [{ $in: ['$level', ['ERROR', 'FATAL']] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Format hourly logs for Chart.js/Recharts
    const chartData = hourlyLogs.map(item => {
      const hourStr = String(item._id.hour).padStart(2, '0') + ':00';
      return {
        time: hourStr,
        INFO: item.INFO,
        WARN: item.WARN,
        ERROR: item.ERROR,
        total: item.total
      };
    });

    // Provide default data points if empty, so dashboard doesn't look blank
    if (chartData.length === 0) {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(Date.now() - i * 60 * 60 * 1000);
        const hourStr = String(d.getHours()).padStart(2, '0') + ':00';
        chartData.push({ time: hourStr, INFO: 0, WARN: 0, ERROR: 0, total: 0 });
      }
    }

    res.json({
      totalLogs,
      levelCounts,
      errorRate,
      activeAnomaliesCount,
      serviceCounts: serviceCounts.map(s => ({ service: s._id, count: s.count })),
      chartData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
