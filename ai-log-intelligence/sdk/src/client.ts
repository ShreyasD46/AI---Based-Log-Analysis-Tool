import { SDKConfig, LogLevel, LogPayload } from "./types";
import { Batcher } from "./batcher";

export class LogAIClient {
  private config: Required<SDKConfig>;
  private batcher: Batcher;
  private initialized = false;

  constructor() {
    // Placeholder — init() must be called before logging
    this.config = {} as Required<SDKConfig>;
    this.batcher = {} as Batcher;
  }

  init(userConfig: SDKConfig): void {
    if (this.initialized) {
      console.warn(
        "[logAI] Already initialized. Ignoring duplicate init() call.",
      );
      return;
    }

    // Apply defaults
    this.config = {
      apiKey: userConfig.apiKey,
      service: userConfig.service,
      baseUrl: userConfig.baseUrl ?? "http://localhost:3001",
      environment: userConfig.environment ?? "production",
      batchSize: userConfig.batchSize ?? 10,
      flushInterval: userConfig.flushInterval ?? 3000,
      maxRetries: userConfig.maxRetries ?? 3,
    };

    this.batcher = new Batcher({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      maxRetries: this.config.maxRetries,
    });

    this.initialized = true;

    // Flush on clean shutdown (Ctrl+C, SIGTERM from Docker/k8s)
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
    // Flush on unhandled errors — you want the last logs before a crash
    process.on("uncaughtException", (err: Error) => {
      this.error("Uncaught exception", {
        error: err.message,
        stack: err.stack,
      });
      this.shutdown().finally(() => process.exit(1));
    });
  }

  // Core log method — all public methods call this
  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    if (!this.initialized) {
      console.warn("[logAI] SDK not initialized. Call logAI.init() first.");
      return;
    }

    const payload: LogPayload = {
      service: this.config.service,
      level,
      message,
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      meta: meta ?? {},
    };

    this.batcher.enqueue(payload);
  }

  // Public API — these are what developers call in their apps
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("DEBUG", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("WARN", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("ERROR", message, meta);
  }

  fatal(message: string, meta?: Record<string, unknown>): void {
    this.log("FATAL", message, meta);
  }

  // Manual flush — useful in tests or before critical operations
  async flush(): Promise<void> {
    return this.batcher.flush();
  }

  async shutdown(): Promise<void> {
    await this.batcher.shutdown();
  }
}
