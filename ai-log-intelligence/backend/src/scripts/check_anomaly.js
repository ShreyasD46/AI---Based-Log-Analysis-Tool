const mongoose = require('mongoose');
const Anomaly = require('../models/Anomaly');
const config = require('../config');

async function check() {
  await mongoose.connect(config.MONGODB_URI);
  const anomalies = await Anomaly.find({}).sort({ createdAt: -1 }).limit(2);
  for (const anomaly of anomalies) {
    console.log('ID:', anomaly._id);
    console.log('Service:', anomaly.service);
    console.log('Status:', anomaly.remediationStatus);
    console.log('Script:', anomaly.remediationScript);
    console.log('Logs:', anomaly.remediationLogs);
    console.log('----------------------------------------------------');
  }
  await mongoose.disconnect();
}

check().catch(console.error);
