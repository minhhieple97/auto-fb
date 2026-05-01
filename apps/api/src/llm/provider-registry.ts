import type { LlmProvider } from "@auto-fb/shared";

export type ProviderDefinition = {
  provider: LlmProvider;
  displayName: string;
  defaultModel: string;
  envKey?: string;
  models: string[];
};

export const providerDefinitions: ProviderDefinition[] = [
  {
    provider: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    models: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"]
  },
  {
    provider: "anthropic",
    displayName: "Anthropic Claude",
    defaultModel: "claude-3-5-haiku-latest",
    envKey: "ANTHROPIC_API_KEY",
    models: ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"]
  },
  {
    provider: "gemini",
    displayName: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    envKey: "GEMINI_API_KEY",
    models: ["gemini-1.5-flash", "gemini-1.5-pro"]
  },
  {
    provider: "deepseek",
    displayName: "DeepSeek",
    defaultModel: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
    models: ["deepseek-chat", "deepseek-reasoner"]
  },
  {
    provider: "mock",
    displayName: "Mock local provider",
    defaultModel: "mock-copywriter-v1",
    models: ["mock-copywriter-v1"]
  }
];

export function getProviderDefinition(provider: LlmProvider): ProviderDefinition {
  const definition = providerDefinitions.find((candidate) => candidate.provider === provider);
  if (!definition) {
    throw new Error(`Unsupported LLM provider ${provider}`);
  }
  return definition;
}
