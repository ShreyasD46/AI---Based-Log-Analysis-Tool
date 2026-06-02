const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  apiKey:   { type: String, required: true, index: true },
  service:  { type: String, required: true },
  type: {
    type: String,
    enum: ['ERROR_SPIKE', 'HIGH_ERROR_RATE', 'REPEATED_ERROR', 'FATAL_ERROR'],
    required: true
  },
  // Summary of what triggered this anomaly
  summary: { type: String, required: true },
  // How many logs were involved
  logCount: { type: Number, required: true },
  // The error messages that triggered this (for grouping)
  errorMessages: [{ type: String }],
  // Time window this anomaly covers
  windowStart: { type: Date, required: true },
  windowEnd:   { type: Date, required: true },
  // Was an AI insight generated for this?
  insightGenerated: { type: Boolean, default: false },
  insightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insight' },
  resolved: { type: Boolean, default: false },
  
  // Auto-Remediation (Self-Healing) Fields
  remediationStatus: {
    type: String,
    enum: ['NONE', 'PENDING_APPROVAL', 'EXECUTING', 'SUCCESS', 'FAILED'],
    default: 'NONE'
  },
  remediationScript: { type: String },
  remediationLogs: [{ type: String }],
  autoHealEnabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Anomaly', anomalySchema);