const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
  apiKey:    { type: String, required: true, index: true },
  service:   { type: String, required: true },
  anomalyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Anomaly', 
    required: true 
  },
  // The AI-generated content
  rootCause:  { type: String, required: true },
  fix:        { type: String, required: true },
  severity:   { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  // 0–1 score from the LLM
  confidence: { type: Number, min: 0, max: 1 },
  // The raw logs fed to the LLM (useful for debugging your prompts)
  logsAnalyzed: [{ type: String }],
  // Which model generated this
  model: { type: String, default: 'gemini-1.5-flash' }
}, { timestamps: true });

module.exports = mongoose.model('Insight', insightSchema);