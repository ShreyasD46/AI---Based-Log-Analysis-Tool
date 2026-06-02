const ApiKey = require('../models/ApiKey');

/**
 * Authentication middleware that validates the X-API-Key header.
 * Hashes the raw key using SHA-256 and finds a matching active record in MongoDB.
 */
async function authenticate(req, res, next) {
  try {
    const rawKey = req.headers['x-api-key'];

    if (!rawKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    const keyHash = ApiKey.hashKey(rawKey);
    const keyRecord = await ApiKey.findOne({ keyHash, isActive: true });

    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Attach key details to request
    req.apiKey = keyHash;
    req.apiKeyRecord = keyRecord;

    // Asynchronously update lastUsed timestamp in background without blocking req
    keyRecord.lastUsed = new Date();
    keyRecord.save().catch(err => console.error('[Auth] Failed to update key lastUsed:', err.message));

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
