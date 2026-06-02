const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  // Store a HASH of the key, never the raw key
  // Same principle as storing hashed passwords
  keyHash: { type: String, required: true, unique: true },
  // Human-readable name for this key
  name:    { type: String, required: true },
  // Which services are allowed to use this key
  services: [{ type: String }],
  isActive: { type: Boolean, default: true },
  lastUsed: { type: Date }
}, { timestamps: true });

// Static method to generate a new key
apiKeySchema.statics.generateKey = function() {
  return 'logai_' + crypto.randomBytes(32).toString('hex');
};

// Static method to hash a key for storage/lookup
apiKeySchema.statics.hashKey = function(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);