require('dotenv').config();
const { z } = require('zod');

// This crashes the app at startup if any required env var is missing.
// Much better than crashing at 2am when the missing var is first used.
const envSchema = z.object({
  PORT:                   z.string().default('3001'),
  MONGODB_URI:            z.string().min(1, 'MONGODB_URI is required'),
  GEMINI_API_KEY:         z.string().min(1, 'GEMINI_API_KEY is required'),
  NODE_ENV:               z.enum(['development', 'staging', 'production']).default('development'),
  ANOMALY_THRESHOLD:      z.string().transform(Number).default('10'),
  ANOMALY_WINDOW_MINUTES: z.string().transform(Number).default('5'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // Hard stop — don't run with bad config
}

module.exports = parsed.data;