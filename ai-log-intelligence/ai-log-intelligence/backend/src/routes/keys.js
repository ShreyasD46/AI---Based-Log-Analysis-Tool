const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');

// GET /api/keys - List all keys (excluding hashes)
router.get('/', async (req, res, next) => {
  try {
    const keys = await ApiKey.find({}, 'name services isActive lastUsed createdAt')
      .sort({ createdAt: -1 });
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

// POST /api/keys - Generate a new API Key
router.post('/', async (req, res, next) => {
  try {
    const { name, services } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const rawKey = ApiKey.generateKey();
    const keyHash = ApiKey.hashKey(rawKey);

    const newKey = new ApiKey({
      keyHash,
      name,
      services: services || [],
      isActive: true
    });

    await newKey.save();

    // Return raw key ONCE so developer can copy it
    res.status(201).json({
      _id: newKey._id,
      apiKey: rawKey,
      name: newKey.name,
      services: newKey.services,
      isActive: newKey.isActive,
      createdAt: newKey.createdAt
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/keys/:id/revoke - Revoke/deactivate an API Key
router.post('/:id/revoke', async (req, res, next) => {
  try {
    const { id } = req.params;
    const key = await ApiKey.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true, select: 'name services isActive' }
    );

    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key revoked successfully', key });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
