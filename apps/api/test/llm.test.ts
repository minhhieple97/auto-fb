import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpLlmClient } from "../src/llm/http-llm.client.js";
import { LlmService } from "../src/llm/llm.service.js";
import { MockLlmClient } from "../src/llm/mock-llm.client.js";
import { getProviderDefinition, providerDefinitions } from "../src/llm/provider-registry.js";
import type { GeneratePostInput } from "../src/llm/llm.types.js";
import { jsonResponse } from "./helpers.js";

const generateInput: GeneratePostInput = {
  provider: "openai",
  model: "gpt-4o-mini",
  topic: "AI operations",
  language: "vi",
  brandVoice: "practical",
  summary: "Teams can automate repetitive tasks.",
  keyFacts: ["Fact one", "Fact two", "Fact three", "Fact four"],
  sourceUrl: "https://example.com/story"
};

describe("LLM provider registry", () => {
  it("exposes all configured provider definitions", () => {
    expect(providerDefinitions.map((definition) => definition.provider).sort()).toEqual([
      "anthropic",
      "deepseek",
      "gemini",
      "mock",
      "openai"
    ]);
    expect(getProviderDefinition("openai")).toMatchObject({ envKey: "OPENAI_API_KEY", defaultModel: "gpt-4o-mini" });
  });

  it("throws for unsupported providers", () => {
    expect(() => getProviderDefinition("unsupported" as never)).toThrow("Unsupported LLM provider unsupported");
  });
});

describe("MockLlmClient", () => {
  it("generates deterministic copy with up to three key facts and source attribution", async () => {
    const result = await new MockLlmClient().generatePost(generateInput);

    expect(result).toMatchObject({ provider: "mock", model: "mock-copywriter-v1" });
    expect(result.text).toContain("Goc nhin nhanh ve AI operations");
    expect(result.text).toContain("- Fact one\n- Fact two\n- Fact three");
    expect(result.text).not.toContain("Fact four");
    expect(result.text).toContain("Nguon: https://example.com/story");
  });
});

describe("LlmService", () => {
  it("lists configured providers", () => {
    expect(new LlmService(new ConfigService()).listProviders()).toBe(providerDefinitions);
  });

  it("uses the mock client for the mock provider and for missing non-production keys", async () => {
    const service = new LlmService(new ConfigService({ NODE_ENV: "test" }));

    await expect(service.generatePost({ ...generateInput, provider: "mock" })).resolves.toMatchObject({ provider: "mock" });
    await expect(service.generatePost({ ...generateInput, provider: "openai" })).resolves.toMatchObject({ provider: "mock" });
  });

  it("throws for missing provider keys in production", () => {
    const service = new LlmService(new ConfigService({ NODE_ENV: "production" }));

    expect(() => service.createClient("openai")).toThrow("Missing OPENAI_API_KEY for openai");
  });

  it("creates an HTTP client when the provider key exists", () => {
    const service = new LlmService(new ConfigService({ OPENAI_API_KEY: "sk_test" }));

    expect(service.createClient("openai")).toBeInstanceOf(HttpLlmClient);
  });
});

describe("HttpLlmClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("calls OpenAI-compatible chat completions and trims response text", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "  Generated post  " } }] }));

    const result = await new HttpLlmClient({ provider: "openai", apiKey: "sk_test" }).generatePost(generateInput);

    expect(result).toEqual({ text: "Generated post", provider: "openai", model: "gpt-4o-mini" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer sk_test" })
      })
    );
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body).toMatchObject({ model: "gpt-4o-mini", temperature: 0.7 });
    expect(body.messages[1].content).toContain("Source URL: https://example.com/story");
  });

  it("uses the DeepSeek compatible endpoint for deepseek requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "DeepSeek post" } }] }));

    await new HttpLlmClient({ provider: "deepseek", apiKey: "sk_test" }).generatePost({
      ...generateInput,
      provider: "deepseek",
      model: "deepseek-chat"
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.deepseek.com/chat/completions");
  });

  it("calls Anthropic messages API and joins content parts", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ content: [{ text: "Part one" }, { text: "Part two" }] }));

    const result = await new HttpLlmClient({ provider: "anthropic", apiKey: "anthropic_key" }).generatePost({
      ...generateInput,
      provider: "anthropic",
      model: "claude-3-5-haiku-latest"
    });

    expect(result.text).toBe("Part one\nPart two");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "anthropic_key", "anthropic-version": "2023-06-01" })
      })
    );
  });

  it("calls Gemini generateContent API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ candidates: [{ content: { parts: [{ text: "Gemini post" }] } }] }));

    const result = await new HttpLlmClient({ provider: "gemini", apiKey: "gemini_key" }).generatePost({
      ...generateInput,
      provider: "gemini",
      model: "gemini-1.5-flash"
    });

    expect(result.text).toBe("Gemini post");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=gemini_key"
    );
  });

  it("throws provider error messages from non-OK responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ error: { message: "quota exceeded" } }, { status: 429 }));

    await expect(new HttpLlmClient({ provider: "openai", apiKey: "sk_test" }).generatePost(generateInput)).rejects.toThrow(
      "quota exceeded"
    );
  });
});
