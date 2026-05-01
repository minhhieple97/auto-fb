import { describe, expect, it, vi } from "vitest";
import { TimeoutError, isTransientError, withResilience, withRetry, withTimeout } from "../src/common/retry.js";

describe("isTransientError", () => {
  it("treats TimeoutError as transient", () => {
    expect(isTransientError(new TimeoutError("op", 1000))).toBe(true);
  });

  it("treats 5xx and 429 status messages as transient", () => {
    expect(isTransientError(new Error("Anthropic returned 503"))).toBe(true);
    expect(isTransientError(new Error("LLM provider returned 429"))).toBe(true);
    expect(isTransientError(new Error("Image source https://x returned 502"))).toBe(true);
  });

  it("does not retry 4xx (except 408/425/429)", () => {
    expect(isTransientError(new Error("LLM returned 400"))).toBe(false);
    expect(isTransientError(new Error("LLM returned 401"))).toBe(false);
    expect(isTransientError(new Error("LLM returned 404"))).toBe(false);
    expect(isTransientError(new Error("LLM returned 408"))).toBe(true);
  });

  it("treats network ECONN errors as transient via cause.code", () => {
    const error = new TypeError("fetch failed");
    (error as { cause?: unknown }).cause = { code: "ECONNRESET" };
    expect(isTransientError(error)).toBe(true);
  });

  it("treats bare TypeError 'fetch failed' as transient", () => {
    expect(isTransientError(new TypeError("fetch failed"))).toBe(true);
  });

  it("does not retry generic application errors", () => {
    expect(isTransientError(new Error("Campaign has no enabled whitelist sources"))).toBe(false);
    expect(isTransientError(new Error("LLM returned empty post text"))).toBe(false);
  });
});

describe("withTimeout", () => {
  it("resolves when fn finishes before timeout", async () => {
    await expect(withTimeout(async () => "ok", 1000, "op")).resolves.toBe("ok");
  });

  it("rejects with TimeoutError when fn exceeds the timeout", async () => {
    vi.useFakeTimers();
    try {
      const promise = withTimeout(() => new Promise<string>(() => undefined), 100, "slow-op");
      vi.advanceTimersByTime(200);
      await expect(promise).rejects.toBeInstanceOf(TimeoutError);
      await expect(promise).rejects.toThrow("slow-op timed out after 100ms");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("withRetry", () => {
  it("returns immediately when fn succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("first");
    const sleep = vi.fn();

    await expect(withRetry(fn, { attempts: 3, backoffMs: [10, 20], sleep })).resolves.toBe("first");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries transient errors then returns the eventual success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("LLM returned 503"))
      .mockResolvedValueOnce("recovered");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(fn, { attempts: 3, backoffMs: [10, 20], sleep })).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("does not retry permanent errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("LLM returned 401"));
    const sleep = vi.fn();

    await expect(withRetry(fn, { attempts: 3, backoffMs: [10, 20], sleep })).rejects.toThrow("401");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("throws the last error after exhausting all attempts on transient failures", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Anthropic returned 502"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(fn, { attempts: 3, backoffMs: [10, 20], sleep })).rejects.toThrow("502");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

describe("withResilience", () => {
  it("composes retry and timeout — retries on TimeoutError and resolves on next success", async () => {
    let calls = 0;
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) return new Promise(() => undefined);
      return Promise.resolve("ok");
    });

    vi.useFakeTimers();
    try {
      const promise = withResilience(fn, {
        label: "op",
        timeoutMs: 50,
        attempts: 2,
        backoffMs: [10],
        sleep
      });
      await vi.advanceTimersByTimeAsync(60);
      await expect(promise).resolves.toBe("ok");
    } finally {
      vi.useRealTimers();
    }
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
