const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const Log = require('../models/Log');
const Anomaly = require('../models/Anomaly');
const Insight = require('../models/Insight');

// Helper to generate realistic mock insights and remediation scripts if API key is missing or invalid
function generateMockInsight(anomaly, logs) {
  const errorMsg = anomaly.errorMessages.join(' ').toLowerCase();
  
  let rootCause = "An unexpected exception occurred in the execution pipeline.";
  let fix = "Check service logs and verify system resources.";
  let severity = "MEDIUM";
  let confidence = 0.75;
  
  // Default remediation script is a safe, no-op echo
  let remediationScript = `node -e "console.log('✅ Baseline system diagnostics passed successfully. No remediation required.');"`;

  if (anomaly.service === 'payment-service') {
    rootCause = `Database connection failed. The application was unable to establish a socket connection with MongoDB at the specified URI. This could be due to a database outage, incorrect credentials, or firewall rules blocking port 27017.`;
    fix = `### Recommended Fix:
1. Verify that your MongoDB instance is running:
   \`\`\`bash
   # For local MongoDB
   mongod --dbpath /data/db
   \`\`\`
2. Check your connection string in your environment variables. Ensure the host and port are correct:
   \`\`\`diff
   - MONGODB_URI=mongodb://localhost:27018/bad-db
   + MONGODB_URI=mongodb://127.0.0.1:27017/ai-log-intelligence
   \`\`\`
3. Verify network accessibility by running a ping test from the backend server to the database host.`;
    severity = "HIGH";
    confidence = 0.90;
    
    // Cross-platform node script to patch the simulated env config file
    remediationScript = `node -e "
const fs = require('fs');
const path = 'sandbox/payment-service.env';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/STRIPE_API_PORT=27018/g, 'STRIPE_API_PORT=27017');
  content = content.replace(/STRIPE_TIMEOUT=500/g, 'STRIPE_TIMEOUT=5000');
  content = content.replace(/mongodb:\\/\\/127.0.0.1:27018/g, 'mongodb://127.0.0.1:27017');
  fs.writeFileSync(path, content);
  console.log('✅ Auto-remediated Stripe/MongoDB connection config in sandbox/payment-service.env');
} else {
  console.error('❌ Error: payment-service.env not found in sandbox');
  process.exit(1);
}
"`;
  } else if (anomaly.service === 'auth-service') {
    rootCause = `Authentication verification failed. The service rejected requests because the JWT token was either expired, malformed, or missing from the Authorization header.`;
    fix = `### Recommended Fix:
1. Ensure the Authorization header is passed correctly by the client:
   \`\`\`javascript
   // Axios Example
   headers: {
     Authorization: \`Bearer \${token}\`
   }
   \`\`\`
2. Update the token verification expiration window in your auth configuration to allow a small clock drift (e.g. 5 minutes):
   \`\`\`javascript
   jwt.verify(token, secret, { clockTolerance: 300 });
   \`\`\`
3. Check if the secret key configured on the server matches the key used to sign the token.`;
    severity = "HIGH";
    confidence = 0.85;

    // Cross-platform node script to patch the process manager status file
    remediationScript = `node -e "
const fs = require('fs');
const path = 'sandbox/auth-service.status';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/STATUS=CRASHED/g, 'STATUS=RUNNING');
  content = content.replace(/PID=12451/g, 'PID=' + Math.floor(Math.random() * 10000 + 15000));
  content = content.replace(/LAST_ERROR=.*/g, 'LAST_ERROR=NONE');
  fs.writeFileSync(path, content);
  console.log('✅ Auto-healed daemon: restarted auth service daemon successfully.');
} else {
  console.error('❌ Error: auth-service.status not found in sandbox');
  process.exit(1);
}
"`;
  } else if (anomaly.service === 'gateway-service') {
    rootCause = `API Rate Limit Exceeded. Clients are triggering too many API requests in a short time frame, exceeding the configured rate limiter capacity.`;
    fix = `### Recommended Fix:
1. Implement client-side throttling or debouncing on the frontend.
2. In the backend, increase the rate limiter threshold for trusted services:
   \`\`\`javascript
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 mins
     max: 100 // limit each IP to 100 requests per window
   });
   \`\`\`
3. Set up Redis-based distributed caching to serve frequent read operations.`;
    severity = "LOW";
    confidence = 0.90;

    // Cross-platform node script to patch the gateway JSON configuration file
    remediationScript = `node -e "
const fs = require('fs');
const path = 'sandbox/gateway-service.json';
if (fs.existsSync(path)) {
  const config = JSON.parse(fs.readFileSync(path, 'utf8'));
  config.rate_limit_per_minute = 100;
  config.cache_ttl_seconds = 300;
  fs.writeFileSync(path, JSON.stringify(config, null, 2));
  console.log('✅ Auto-remediated rate limit threshold in sandbox/gateway-service.json to 100 req/min');
} else {
  console.error('❌ Error: gateway-service.json not found in sandbox');
  process.exit(1);
}
"`;
  }

  return {
    rootCause,
    fix,
    severity,
    confidence,
    remediationScript,
    modelUsed: 'mock-analyser-offline'
  };
}

/**
 * Service to generate AI insights for a detected anomaly using Gemini.
 */
async function generateInsight(anomaly) {
  try {
    // 1. Fetch recent log context leading up to anomaly
    const logsContext = await Log.find({
      apiKey: anomaly.apiKey,
      service: anomaly.service,
      timestamp: { $lte: anomaly.windowEnd, $gte: anomaly.windowStart }
    })
    .sort({ timestamp: -1 })
    .limit(20);

    const logTexts = logsContext.map(l => 
      `[${l.timestamp.toISOString()}] [${l.level}] [Type: ${l.type || 'GENERAL'}] ${l.message} ${l.meta ? JSON.stringify(l.meta) : ''}`
    );

    let insightData;
    let modelName = 'gemini-1.5-flash';

    const hasApiKey = config.GEMINI_API_KEY && 
                      config.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE' && 
                      config.GEMINI_API_KEY.trim() !== '';

    if (!hasApiKey) {
      console.warn('⚠️ GEMINI_API_KEY is not configured. Falling back to offline rule-based insight generation.');
      const mock = generateMockInsight(anomaly, logsContext);
      insightData = {
        rootCause: mock.rootCause,
        fix: mock.fix,
        severity: mock.severity,
        confidence: mock.confidence,
        remediationScript: mock.remediationScript
      };
      modelName = mock.modelUsed;
    } else {
      // 2. Initialize Gemini API Client
      const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `You are a Principal DevOps and SRE Engineer. Analyze the following anomalous log cluster and diagnose the system health.
      
Service Name: "${anomaly.service}"
Anomaly Type: "${anomaly.type}"
Anomaly Summary: "${anomaly.summary}"

Logs Context (Newest first):
${logTexts.join('\n')}

Based on the logs above, identify:
1. The technical root cause of the error. Be precise.
2. The recommended fix, including clear instructions and any code block modifications (using markdown diff formats if appropriate).
3. The severity level ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').
4. Your confidence level in this diagnosis (a floating point number between 0.0 and 1.0).
5. A runnable shell command script (remediationScript) that can execute non-interactively to patch or fix the issue locally. It should perform operations like editing config files or running service recovery commands. Write it as a Node.js inline execution command (e.g. node -e "...") to remain cross-platform (supporting Windows and Linux).

You must respond ONLY with a JSON object matching this schema. Do not write any markdown outside of the JSON object.
Schema:
{
  "rootCause": "String (Clear explanation of the error source)",
  "fix": "String (Actionable fix instructions with markdown code blocks)",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": Number (0.0 to 1.0),
  "remediationScript": "String (Runnable Node.js command script, e.g. node -e \\\"...\\\")"
}`;

      const result = await model.generateContent({
        contents: prompt,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      insightData = {
        rootCause: parsed.rootCause || "Failed to identify root cause.",
        fix: parsed.fix || "Check service configuration.",
        severity: parsed.severity || "MEDIUM",
        confidence: parsed.confidence || 0.5,
        remediationScript: parsed.remediationScript || `node -e "console.log('No remediation script generated');"`
      };
    }

    // 3. Save the Insight to DB
    const insight = new Insight({
      apiKey: anomaly.apiKey,
      service: anomaly.service,
      anomalyId: anomaly._id,
      rootCause: insightData.rootCause,
      fix: insightData.fix,
      severity: insightData.severity,
      confidence: insightData.confidence,
      logsAnalyzed: logTexts.slice(0, 10),
      model: modelName
    });

    await insight.save();

    // 4. Update the Anomaly with Insight reference and self-healing state
    anomaly.insightGenerated = true;
    anomaly.insightId = insight._id;
    anomaly.remediationScript = insightData.remediationScript;

    // Check if autoHeal was enabled on the last anomaly for the same service
    const lastAnomaly = await Anomaly.findOne({ 
      service: anomaly.service, 
      _id: { $ne: anomaly._id } 
    }).sort({ createdAt: -1 });

    const autoHealEnabled = lastAnomaly ? lastAnomaly.autoHealEnabled : false;
    anomaly.autoHealEnabled = autoHealEnabled;

    if (autoHealEnabled) {
      anomaly.remediationStatus = 'EXECUTING';
      await anomaly.save();

      // Trigger background auto-heal immediately
      const remediator = require('./remediator');
      remediator.applyFix(anomaly._id).catch(err => {
        console.error('[Gemini] Background auto-heal failed:', err.message);
      });
    } else {
      anomaly.remediationStatus = 'PENDING_APPROVAL';
      await anomaly.save();
    }

    console.log(`✅ AI Insight & Remediation generated successfully for Anomaly ID: ${anomaly._id} [Model: ${modelName}]`);
  } catch (err) {
    console.error('❌ Failed to generate AI Insight:', err.message);
  }
}

module.exports = {
  generateInsight
};
