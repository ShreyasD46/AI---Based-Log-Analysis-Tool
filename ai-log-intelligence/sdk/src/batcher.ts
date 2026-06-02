import { LogPayload, BatchPayload } from './types';
import { withRetry } from './retry';

interface BatcherConfig {
  apiKey: string;
  baseUrl: string;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
}

export class Batcher {
  private queue: LogPayload[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: BatcherConfig;
  private isFlushing = false;

  constructor(config: BatcherConfig) {
    this.config = config;
    this.startAutoFlush();
  }

  // Add a log to the in-memory queue
  enqueue(log: LogPayload): void {
    this.queue.push(log);

    // Flush immediately if we hit the batch size limit
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  // Auto-flush runs on a timer so logs don't sit in queue too long
  private startAutoFlush(): void {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);

    // Don't block Node.js from exiting if this timer is the only thing running
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  // The actual HTTP send
  async flush(): Promise<void> {
    // Prevent overlapping flushes
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;

    // Drain the queue — take what's in it now, clear immediately
    // New logs can be enqueued while this batch is in-flight
    const batch = [...this.queue];
    this.queue = [];

    try {
      await withRetry(
        () => this.sendBatch({ logs: batch }),
        { maxRetries: this.config.maxRetries }
      );
    } catch (err) {
      // On final failure, put logs back in queue
      // In production you'd also write to a local file as a fallback
      console.warn(`[logAI] Failed to send ${batch.length} logs after retries`);
      this.queue = [...batch, ...this.queue];
    } finally {
      this.isFlushing = false;
    }
  }

  private async sendBatch(payload: BatchPayload): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/logs/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}`);
      error.response = { status: response.status };
      throw error;
    }
  }

  // Call this on process exit to flush remaining logs
  async shutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }
}