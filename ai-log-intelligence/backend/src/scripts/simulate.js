const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');
const config = require('../config');

// Load the compiled SDK
let logAI;
try {
  const sdk = require('../../../sdk/dist/index.cjs');
  logAI = sdk.logAI || sdk.default;
} catch (err) {
  console.error('❌ Failed to load SDK from dist. Make sure to build the SDK first using "npm run build" in the sdk directory.');
  process.exit(1);
}

const SERVICES = ['gateway-service', 'auth-service', 'payment-service', 'user-service'];

async function runSimulation() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(config.MONGODB_URI);
  console.log('✅ Connected.');

  // 1. Get or create an API Key for simulation
  let apiKeyRecord = await ApiKey.findOne({ name: 'Simulation Agent' });
  let rawApiKey = '';

  if (!apiKeyRecord) {
    console.log('🔑 Creating a new API Key for simulation...');
    rawApiKey = ApiKey.generateKey();
    const keyHash = ApiKey.hashKey(rawApiKey);
    
    apiKeyRecord = new ApiKey({
      keyHash,
      name: 'Simulation Agent',
      services: SERVICES,
      isActive: true
    });
    await apiKeyRecord.save();
    console.log(`✅ Created API Key: ${rawApiKey}`);
  } else {
    // Since we store hashes, we cannot retrieve the original raw key.
    // So we will revoke the old one and generate a fresh one for the demo run.
    console.log('🔑 Refreshing simulation API key...');
    await ApiKey.deleteOne({ _id: apiKeyRecord._id });
    
    rawApiKey = ApiKey.generateKey();
    const keyHash = ApiKey.hashKey(rawApiKey);
    
    apiKeyRecord = new ApiKey({
      keyHash,
      name: 'Simulation Agent',
      services: SERVICES,
      isActive: true
    });
    await apiKeyRecord.save();
    console.log(`✅ Fresh API Key generated: ${rawApiKey}`);
  }

  // 2. Initialize the SDK
  console.log('🚀 Initializing LogAI SDK...');
  logAI.init({
    apiKey: rawApiKey,
    service: 'gateway-service',
    baseUrl: `http://localhost:${config.PORT}`,
    environment: 'development',
    batchSize: 5,        // Flush frequently
    flushInterval: 2000  // Flush every 2 seconds
  });

  console.log('📝 Injecting standard operational traffic...');
  
  // Send Info and Debug logs
  logAI.info('Gateway route initialized: GET /api/v1/health');
  logAI.debug('Request routing took 12ms', { route: '/api/v1/health', ip: '192.168.1.5' });
  
  // Log from auth-service
  logAI.info('User login attempt started', { username: 'dev_candidate' });
  logAI.info('User successfully authenticated', { userId: 'usr_948194', role: 'admin' });

  await sleep(2500); // Wait for flush

  console.log('⚠️ Injecting warnings...');
  logAI.warn('DB connections high: Pool size at 85% capacity', { maxPool: 100, activePool: 85 });
  logAI.warn('Payment microservice responded slow: 2800ms delay', { endpoint: '/charge', limit: 2000 });

  await sleep(2500);

  // 3. Trigger an ERROR SPIKE anomaly on payment-service
  console.log('🚨 Triggering an Anomaly Spike (12 Errors in payment-service)...');
  
  // Reinitialize SDK for payment-service
  // In real life, services are separate processes. Here we call the client instance directly
  const paymentSDK = new (require('../../../sdk/dist/index.cjs').LogAIClient)();
  paymentSDK.init({
    apiKey: rawApiKey,
    service: 'payment-service',
    baseUrl: `http://localhost:${config.PORT}`,
    environment: 'development',
    batchSize: 5,
    flushInterval: 1000
  });

  const paymentErrors = [
    'Connection refused by payment gateway at stripe-api-v3.com',
    'Socket connection timeout during charge execution',
    'Unable to process transaction: DB Lock timeout on table orders',
    'Payment gateway returned 504 Gateway Timeout',
    'Stripe API signature validation failed: request timestamp drifted',
    'Credit card processing failed: Internal Merchant Account error',
    'Insufficient funds in ledger table for account ACC_38194',
    'Failed to write transaction journal entry: disk space low',
    'Network unreachable: host api.stripe.com is down',
    'Transaction failed: duplicate payment token submitted',
    'Refund request failed: transaction ID tx_842918 already settled',
    'SSL verification failed for api.stripe.com: certificate expired'
  ];

  for (const errMsg of paymentErrors) {
    paymentSDK.error(errMsg, { errorCode: 'ERR_PAYMENT_GATEWAY', durationMs: 5000 });
  }

  await sleep(3000); // Wait for flushes and processing

  // 4. Trigger a FATAL anomaly on auth-service
  console.log('💀 Triggering a FATAL anomaly on auth-service...');
  const authSDK = new (require('../../../sdk/dist/index.cjs').LogAIClient)();
  authSDK.init({
    apiKey: rawApiKey,
    service: 'auth-service',
    baseUrl: `http://localhost:${config.PORT}`,
    environment: 'development',
    batchSize: 1,
    flushInterval: 500
  });

  authSDK.fatal('FATAL ERROR: Null pointer exception in JWT token parser at TokenVerifier.verifyToken() line 42. Process exiting.', {
    stack: 'TypeError: Cannot read properties of undefined (reading \'split\')\n    at TokenVerifier.verifyToken (C:\\app\\auth-service\\src\\verifier.js:42:25)\n    at AuthController.login (C:\\app\\auth-service\\src\\controller.js:12:19)'
  });

  console.log('⏳ Waiting for final SDK flush and AI analysis processing...');
  await sleep(6000); // Let the Gemini API finish background analysis

  console.log('🎉 Simulation traffic successfully generated!');
  console.log(`🔗 API Key for Dashboard: ${rawApiKey}`);
  console.log('You can now start the frontend, enter this API Key, and explore the AI diagnostics.');

  await paymentSDK.shutdown();
  await authSDK.shutdown();
  await logAI.shutdown();
  await mongoose.disconnect();
  process.exit(0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runSimulation().catch(err => {
  console.error('❌ Simulation aborted:', err);
  process.exit(1);
});
