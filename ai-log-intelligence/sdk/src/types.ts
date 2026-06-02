export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogPayload {
  service: string;
  level: LogLevel;
  message: string;
  timestamp: string;        // ISO string
  meta?: Record<string, unknown>; // stack traces, request IDs, etc.
  environment?: string;
}

export interface SDKConfig {
  apiKey: string;
  service: string;
  baseUrl?: string;         // default: http://localhost:3001
  environment?: string;     // default: 'production'
  batchSize?: number;       // how many logs to send at once, default: 10
  flushInterval?: number;   // ms between auto-flushes, default: 3000
  maxRetries?: number;      // default: 3
}

export interface BatchPayload {
  logs: LogPayload[];
}

