const Log = require('../models/Log');
const Anomaly = require('../models/Anomaly');
const config = require('../config');

/**
 * Classifies log message based on common patterns.
 * Helpful for developer analytics.
 */
function classifyLog(message) {
  const msg = message.toLowerCase();
  if (msg.includes('database') || msg.includes('mongodb') || msg.includes('mongoose') || msg.includes('connection') || msg.includes('query') || msg.includes('db_')) {
    return 'DB_ERROR';
  }
  if (msg.includes('auth') || msg.includes('login') || msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('password')) {
    return 'AUTH_FAIL';
  }
  if (msg.includes('timeout') || msg.includes('gateway') || msg.includes('delay') || msg.includes('network') || msg.includes('fetch')) {
    return 'TIMEOUT';
  }
  if (msg.includes('null') || msg.includes('undefined') || msg.includes('pointer') || msg.includes('referenceerror') || msg.includes('not a function')) {
    return 'NULL_POINTER';
  }
  if (msg.includes('rate') || msg.includes('limit') || msg.includes('throttle') || msg.includes('too many requests')) {
    return 'RATE_LIMIT';
  }
  return 'GENERAL';
}

/**
 * Runs anomaly check pipeline on a batch of newly saved logs.
 * Runs asynchronously in the background.
 */
async function analyzeLogs(savedLogs, apiKey) {
  try {
    // 1. Separate logs by service
    const serviceGroups = {};
    const fatalLogs = [];

    for (const log of savedLogs) {
      // Perform classification on warning/error logs
      if (['WARN', 'ERROR', 'FATAL'].includes(log.level)) {
        log.type = classifyLog(log.message);
        await log.save().catch(err => console.error('[AnomalyDetector] Failed to save log type:', err.message));
      }

      if (log.level === 'FATAL') {
        fatalLogs.push(log);
      }

      if (log.level === 'ERROR' || log.level === 'FATAL') {
        if (!serviceGroups[log.service]) {
          serviceGroups[log.service] = [];
        }
        serviceGroups[log.service].push(log);
      }
    }

    // 2. Handle FATAL errors immediately as distinct anomalies
    for (const fatalLog of fatalLogs) {
      await triggerFatalAnomaly(fatalLog, apiKey);
    }

    // 3. Check for error spikes for each service group
    for (const service of Object.keys(serviceGroups)) {
      await checkErrorSpike(service, serviceGroups[service], apiKey);
    }
  } catch (err) {
    console.error('[AnomalyDetector] Error during log analysis:', err);
  }
}

/**
 * Instantly triggers an anomaly for FATAL logs.
 */
async function triggerFatalAnomaly(log, apiKey) {
  try {
    // Prevent duplicating identical fatal logs in last 5 minutes
    const windowStart = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await Anomaly.findOne({
      apiKey,
      service: log.service,
      type: 'FATAL_ERROR',
      resolved: false,
      summary: { $regex: log.message.substring(0, 50), $options: 'i' }
    });

    if (existing) {
      existing.logCount += 1;
      existing.windowEnd = new Date();
      await existing.save();
      return;
    }

    const anomaly = new Anomaly({
      apiKey,
      service: log.service,
      type: 'FATAL_ERROR',
      summary: `FATAL error encountered: ${log.message.substring(0, 80)}...`,
      logCount: 1,
      errorMessages: [log.message],
      windowStart: new Date(),
      windowEnd: new Date()
    });

    await anomaly.save();
    console.log(`🚨 FATAL Anomaly created for ${log.service}`);

    // Trigger AI Insight asynchronously
    triggerAiInsight(anomaly);
  } catch (err) {
    console.error('[AnomalyDetector] Failed to trigger fatal anomaly:', err.message);
  }
}

/**
 * Checks if the number of errors exceeds the threshold in the window.
 */
async function checkErrorSpike(service, serviceLogs, apiKey) {
  try {
    const windowMinutes = config.ANOMALY_WINDOW_MINUTES;
    const threshold = config.ANOMALY_THRESHOLD;
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Count all errors for this service in the window
    const errorCount = await Log.countDocuments({
      apiKey,
      service,
      level: { $in: ['ERROR', 'FATAL'] },
      timestamp: { $gte: windowStart }
    });

    if (errorCount >= threshold) {
      // Check for an existing unresolved error spike for this service in the window
      const existingAnomaly = await Anomaly.findOne({
        apiKey,
        service,
        type: 'ERROR_SPIKE',
        resolved: false,
        createdAt: { $gte: windowStart }
      });

      const uniqueErrorMessages = [...new Set(serviceLogs.map(l => l.message))];

      if (existingAnomaly) {
        // Update existing anomaly
        existingAnomaly.logCount = errorCount;
        existingAnomaly.windowEnd = new Date();
        
        // Merge error messages
        const mergedMessages = new Set([...existingAnomaly.errorMessages, ...uniqueErrorMessages]);
        existingAnomaly.errorMessages = Array.from(mergedMessages).slice(0, 20); // cap at 20

        await existingAnomaly.save();
        console.log(`📈 Updated active Anomaly spike for ${service} (errors: ${errorCount})`);
        
        // Retrigger AI Insight if none is generated yet
        if (!existingAnomaly.insightGenerated) {
          triggerAiInsight(existingAnomaly);
        }
      } else {
        // Create new anomaly
        const newAnomaly = new Anomaly({
          apiKey,
          service,
          type: 'ERROR_SPIKE',
          summary: `High error volume: ${errorCount} errors in ${windowMinutes} min (threshold: ${threshold})`,
          logCount: errorCount,
          errorMessages: uniqueErrorMessages.slice(0, 15),
          windowStart,
          windowEnd: new Date()
        });

        await newAnomaly.save();
        console.log(`🚨 New Anomaly spike created for ${service} (errors: ${errorCount})`);

        // Trigger AI Insight
        triggerAiInsight(newAnomaly);
      }
    }
  } catch (err) {
    console.error('[AnomalyDetector] Error checking spikes:', err.message);
  }
}

/**
 * Helper to call the Gemini service.
 */
function triggerAiInsight(anomaly) {
  // Dynamic import to avoid circular dependency
  const geminiService = require('./gemini');
  geminiService.generateInsight(anomaly).catch(err => {
    console.error('[AnomalyDetector] Gemini analysis failed:', err.message);
  });
}

module.exports = {
  analyzeLogs,
  classifyLog
};
