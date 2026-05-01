export class TimeoutError extends Error {
  readonly label: string;
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export type RetryOptions = {
  attempts: number;
  backoffMs: readonly number[];
  retryOn?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

export type ResilienceOptions = RetryOptions & {
  label: string;
  timeoutMs: number;
};

export const retryPolicies = {
  llm: { attempts: 3, backoffMs: [500, 1500, 4000], timeoutMs: 30_000 },
  collector: { attempts: 3, backoffMs: [500, 1500, 4000], timeoutMs: 60_000 },
  storage: { attempts: 3, backoffMs: [500, 1500, 4000], timeoutMs: 30_000 }
} as const;

const transientNetworkCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "EHOSTUNREACH"
]);

export function isTransientError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (!(error instanceof Error)) return false;

  const statusMatch = error.message.match(/(?:returned|status\s*code\s*[:=]?)\s*(\d{3})/i);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    return status === 408 || status === 425 || status === 429 || (status >= 500 && status < 600);
  }

  const code = (error as NodeJS.ErrnoException).code ?? (error.cause as { code?: string } | undefined)?.code;
  if (code && transientNetworkCodes.has(code)) return true;

  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch failed")) return true;

  return false;
}

export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label, timeoutMs)), timeoutMs);
    fn().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const retryOn = options.retryOn ?? isTransientError;
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === options.attempts - 1;
      if (isLastAttempt || !retryOn(error)) throw error;
      const delay = options.backoffMs[attempt] ?? options.backoffMs[options.backoffMs.length - 1] ?? 0;
      if (delay > 0) await sleep(delay);
    }
  }
  throw lastError;
}

export async function withResilience<T>(fn: () => Promise<T>, options: ResilienceOptions): Promise<T> {
  return withRetry(() => withTimeout(fn, options.timeoutMs, options.label), options);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
