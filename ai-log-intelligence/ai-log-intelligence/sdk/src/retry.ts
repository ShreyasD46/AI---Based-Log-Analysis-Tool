interface RetryOptions {
  maxRetries: number;
  baseDelayMs?: number;   // starting delay, default 200ms
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelayMs = 200 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLastAttempt = attempt === maxRetries;

      // Don't retry on 4xx — those are client errors (bad API key, bad payload)
      // Only retry on 5xx (server errors) or network failures
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500) {
        throw err;
      }

      if (isLastAttempt) {
        throw err;
      }

      // Exponential backoff: 200ms → 400ms → 800ms
      // Jitter (+/- 20%) prevents all retries hitting the server at once
      const delay = baseDelayMs * Math.pow(2, attempt);
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      await sleep(delay + jitter);
    }
  }

  // TypeScript needs this even though the loop always returns or throws
  throw new Error('Retry failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}