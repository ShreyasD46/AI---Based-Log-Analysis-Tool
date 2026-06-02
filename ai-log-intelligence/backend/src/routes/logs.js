const express = require('express');
const router = express.Router();
const { z } = require('zod');
const Log = require('../models/Log');
const authenticate = require('../middleware/auth');
const anomalyDetector = require('../services/anomalyDetector');

// Zod schema for log payload validation
const logPayloadSchema = z.object({
  service: z.string().min(1, 'Service is required'),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']),
  message: z.string().min(1, 'Message is required'),
  timestamp: z.string().optional(),
  meta: z.any().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional()
});

const batchSchema = z.object({
  logs: z.array(logPayloadSchema).min(1, 'Batch must contain at least one log')
});

// GET /api/logs - Paginated and filterable log query (authenticated)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { 
      service, 
      level, 
      search, 
      type, 
      page = 1, 
      limit = 50, 
      start, 
      end 
    } = req.query;

    const query = { apiKey: req.apiKey };

    if (service) query.service = service;
    if (level) query.level = level;
    if (type) query.type = type;
    
    if (search) {
      // Case-insensitive regex search on message
      query.message = { $regex: search, $options: 'i' };
    }

    if (start || end) {
      query.timestamp = {};
      if (start) query.timestamp.$gte = new Date(start);
      if (end) query.timestamp.$lte = new Date(end);
    }

    const skipIndex = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      Log.find(query)
        .sort({ timestamp: -1 })
        .skip(skipIndex)
        .limit(Number(limit)),
      Log.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/logs/batch - Ingest batches of logs from the SDK (authenticated)
router.post('/batch', authenticate, async (req, res, next) => {
  try {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid batch payload', 
        details: parsed.error.flatten().fieldErrors 
      });
    }

    const { logs } = parsed.data;

    // Attach current API key to all log entries
    const logDocuments = logs.map(log => ({
      ...log,
      apiKey: req.apiKey,
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
    }));

    // Bulk insert into MongoDB for high performance
    const savedLogs = await Log.insertMany(logDocuments);

    // Trigger anomaly detection asynchronously - do not block client response
    anomalyDetector.analyzeLogs(savedLogs, req.apiKey).catch(err => {
      console.error('[AnomalyDetector] Background analysis error:', err.message);
    });

    res.status(201).json({
      message: `Successfully ingested ${savedLogs.length} logs`,
      count: savedLogs.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
