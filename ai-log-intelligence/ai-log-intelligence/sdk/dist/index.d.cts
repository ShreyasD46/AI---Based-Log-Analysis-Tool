type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
interface LogPayload {
    service: string;
    level: LogLevel;
    message: string;
    timestamp: string;
    meta?: Record<string, unknown>;
    environment?: string;
}
interface SDKConfig {
    apiKey: string;
    service: string;
    baseUrl?: string;
    environment?: string;
    batchSize?: number;
    flushInterval?: number;
    maxRetries?: number;
}

declare class LogAIClient {
    private config;
    private batcher;
    private initialized;
    constructor();
    init(userConfig: SDKConfig): void;
    private log;
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    fatal(message: string, meta?: Record<string, unknown>): void;
    flush(): Promise<void>;
    shutdown(): Promise<void>;
}

declare const logAI: LogAIClient;

export { LogAIClient, type LogLevel, type LogPayload, type SDKConfig, logAI as default, logAI };
