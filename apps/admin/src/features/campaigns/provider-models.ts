import type { LlmProvider } from "@auto-fb/shared";

export const providerModels: Record<LlmProvider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  mock: ["mock-copywriter-v1"]
};
