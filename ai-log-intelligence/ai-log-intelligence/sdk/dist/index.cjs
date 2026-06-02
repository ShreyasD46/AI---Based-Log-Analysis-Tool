"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  LogAIClient: () => LogAIClient,
  default: () => index_default,
  logAI: () => logAI
});
module.exports = __toCommonJS(index_exports);

// src/retry.ts
async function withRetry(fn, options) {
  const { maxRetries, baseDelayMs = 200 } = options;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500) {
        throw err;
      }
      if (isLastAttempt) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      await sleep(delay + jitter);
    }
  }
  throw new Error("Retry failed");
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/batcher.ts
var Batcher = class {
  constructor(config) {
    this.queue = [];
    this.timer = null;
    this.isFlushing = false;
    this.config = config;
    this.startAutoFlush();
  }
  // Add a log to the in-memory queue
  enqueue(log) {
    this.queue.push(log);
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }
  // Auto-flush runs on a timer so logs don't sit in queue too long
  startAutoFlush() {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
    if (this.timer.unref) {
      this.timer.unref();
    }
  }
  // The actual HTTP send
  async flush() {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;
    const batch = [...this.queue];
    this.queue = [];
    try {
      await withRetry(
        () => this.sendBatch({ logs: batch }),
        { maxRetries: this.config.maxRetries }
      );
    } catch (err) {
      console.warn(`[logAI] Failed to send ${batch.length} logs after retries`);
      this.queue = [...batch, ...this.queue];
    } finally {
      this.isFlushing = false;
    }
  }
  async sendBatch(payload) {
    const response = await fetch(`${this.config.baseUrl}/api/logs/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = { status: response.status };
      throw error;
    }
  }
  // Call this on process exit to flush remaining logs
  async shutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }
};

// src/client.ts
var LogAIClient = class {
  constructor() {
    this.initialized = false;
    this.config = {};
    this.batcher = {};
  }
  init(userConfig) {
    if (this.initialized) {
      console.warn(
        "[logAI] Already initialized. Ignoring duplicate init() call."
      );
      return;
    }
    this.config = {
      apiKey: userConfig.apiKey,
      service: userConfig.service,
      baseUrl: userConfig.baseUrl ?? "http://localhost:3001",
      environment: userConfig.environment ?? "production",
      batchSize: userConfig.batchSize ?? 10,
      flushInterval: userConfig.flushInterval ?? 3e3,
      maxRetries: userConfig.maxRetries ?? 3
    };
    this.batcher = new Batcher({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      maxRetries: this.config.maxRetries
    });
    this.initialized = true;
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
    process.on("uncaughtException", (err) => {
      this.error("Uncaught exception", {
        error: err.message,
        stack: err.stack
      });
      this.shutdown().finally(() => process.exit(1));
    });
  }
  // Core log method — all public methods call this
  log(level, message, meta) {
    if (!this.initialized) {
      console.warn("[logAI] SDK not initialized. Call logAI.init() first.");
      return;
    }
    const payload = {
      service: this.config.service,
      level,
      message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: this.config.environment,
      meta: meta ?? {}
    };
    this.batcher.enqueue(payload);
  }
  // Public API — these are what developers call in their apps
  debug(message, meta) {
    this.log("DEBUG", message, meta);
  }
  info(message, meta) {
    this.log("INFO", message, meta);
  }
  warn(message, meta) {
    this.log("WARN", message, meta);
  }
  error(message, meta) {
    this.log("ERROR", message, meta);
  }
  fatal(message, meta) {
    this.log("FATAL", message, meta);
  }
  // Manual flush — useful in tests or before critical operations
  async flush() {
    return this.batcher.flush();
  }
  async shutdown() {
    await this.batcher.shutdown();
  }
};

// src/index.ts
var logAI = new LogAIClient();
var index_default = logAI;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LogAIClient,
  logAI
});
