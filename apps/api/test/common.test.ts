import { BadRequestException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { contentHash, normalizeForDedupe } from "../src/common/hash.js";
import { nowIso } from "../src/common/time.js";
import { ZodValidationPipe } from "../src/common/zod-validation.pipe.js";

describe("common utilities", () => {
  afterEach(() => vi.useRealTimers());

  it("normalizes noisy text before dedupe hashing", () => {
    expect(normalizeForDedupe("Xin CHAO!!! https://example.com/bai-viet")).toBe("xin chao");
    expect(normalizeForDedupe("Cảm ơn, ĐỘI NGŨ auto-fb.")).toBe("cam on đoi ngu auto fb");
  });

  it("creates stable hashes for semantically equivalent content", () => {
    expect(contentHash("Hello!!!")).toBe(contentHash("hello"));
    expect(contentHash("Hello world")).not.toBe(contentHash("Different world"));
  });

  it("returns the current timestamp in ISO format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T07:00:00.000Z"));

    expect(nowIso()).toBe("2026-05-01T07:00:00.000Z");
  });

  it("parses valid values through ZodValidationPipe", () => {
    const pipe = new ZodValidationPipe(
      z.object({
        name: z.string().min(2),
        enabled: z.boolean().default(true)
      })
    );

    expect(pipe.transform({ name: "Source" })).toEqual({ name: "Source", enabled: true });
  });

  it("raises a BadRequestException with Zod issues for invalid values", () => {
    const pipe = new ZodValidationPipe(z.object({ name: z.string().min(2) }));

    expect(() => pipe.transform({ name: "x" })).toThrow(BadRequestException);
  });
});
