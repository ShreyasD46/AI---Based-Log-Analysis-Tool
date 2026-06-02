const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  // Which company/project sent this log
  apiKey: { 
    type: String, 
    required: true, 
    index: true  // ← indexed: you'll query logs BY apiKey constantly
  },
  service: { 
    type: String, 
    required: true, 
    index: true  // ← filter logs by service name
  },
  level: { 
    type: String, 
    enum: ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL'],
    required: true,
    index: true
  },
  message: { 
    type: String, 
    required: true 
  },
  // Parsed/classified type — added by your processing pipeline
  type: { 
    type: String,
    // e.g. "DB_ERROR", "AUTH_FAIL", "TIMEOUT", "NULL_POINTER"
    default: 'UNKNOWN'
  },
  // Extra data the SDK can attach (stack trace, request ID, etc.)
  meta: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true  // ← time-range queries need this
  }
}, {
  // Automatically adds createdAt and updatedAt
  timestamps: true
});

// Compound index — queries like "all ERRORs for payment-service in last 5 min"
// This is a real-world indexing pattern worth mentioning in interviews
logSchema.index({ apiKey: 1, level: 1, timestamp: -1 });
logSchema.index({ apiKey: 1, service: 1, timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);