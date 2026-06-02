const express = require('express');
const router = express.Router();
const Anomaly = require('../models/Anomaly');
const Insight = require('../models/Insight');
const authenticate = require('../middleware/auth');

// GET /api/anomalies - Retrieve all anomalies (authenticated)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { service, resolved, type, limit = 20, page = 1 } = req.query;
    const query = { apiKey: req.apiKey };

    if (service) query.service = service;
    if (type) query.type = type;
    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    const skipIndex = (Number(page) - 1) * Number(limit);

    const [anomalies, total] = await Promise.all([
      Anomaly.find(query)
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(Number(limit)),
      Anomaly.countDocuments(query)
    ]);

    res.json({
      anomalies,
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

// GET /api/anomalies/:id - Retrieve a specific anomaly by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const anomaly = await Anomaly.findOne({ _id: id, apiKey: req.apiKey });

    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    res.json(anomaly);
  } catch (err) {
    next(err);
  }
});

// GET /api/anomalies/:id/insight - Get the AI insight for a specific anomaly
router.get('/:id/insight', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const insight = await Insight.findOne({ anomalyId: id, apiKey: req.apiKey });

    if (!insight) {
      return res.status(404).json({ error: 'AI Insight not found or still generating' });
    }

    res.json(insight);
  } catch (err) {
    next(err);
  }
});

// POST /api/anomalies/:id/resolve - Mark anomaly as resolved
router.post('/:id/resolve', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const anomaly = await Anomaly.findOneAndUpdate(
      { _id: id, apiKey: req.apiKey },
      { resolved: true },
      { new: true }
    );

    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    res.json({ message: 'Anomaly marked as resolved', anomaly });
  } catch (err) {
    next(err);
  }
});

// POST /api/anomalies/:id/remediate - Trigger self-healing execution
router.post('/:id/remediate', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const anomaly = await Anomaly.findOne({ _id: id, apiKey: req.apiKey });

    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    if (!anomaly.remediationScript) {
      return res.status(400).json({ error: 'No remediation script exists for this anomaly' });
    }

    // Call remediator service asynchronously (don't block the HTTP thread)
    const remediator = require('../services/remediator');
    remediator.applyFix(anomaly._id).catch(err => {
      console.error('[Remediator] Trigger error:', err.message);
    });

    res.json({ message: 'Remediation pipeline started', status: 'EXECUTING' });
  } catch (err) {
    next(err);
  }
});

// POST /api/anomalies/:id/remediation-settings - Toggle Auto-Heal setting for this service
router.post('/:id/remediation-settings', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { autoHealEnabled } = req.body;

    if (autoHealEnabled === undefined) {
      return res.status(400).json({ error: 'autoHealEnabled is required' });
    }

    // Find the current anomaly
    const anomaly = await Anomaly.findOne({ _id: id, apiKey: req.apiKey });
    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    // Update ALL unresolved anomalies of this service to stay in sync
    await Anomaly.updateMany(
      { service: anomaly.service, apiKey: req.apiKey, resolved: false },
      { autoHealEnabled }
    );

    // Save on current one
    anomaly.autoHealEnabled = autoHealEnabled;
    await anomaly.save();

    res.json({ message: 'Remediation settings updated', autoHealEnabled });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
