import { LogAIClient } from './client';
export type { SDKConfig, LogPayload, LogLevel } from './types';
export { LogAIClient };

// Singleton — one instance per process, just like console
const logAI = new LogAIClient();

export default logAI;

// Also named export so both import styles work:
// import logAI from 'log-ai-tool'
// import { logAI } from 'log-ai-tool'
export { logAI };