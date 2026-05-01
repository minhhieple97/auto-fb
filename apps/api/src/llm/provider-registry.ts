import { llmProviderModels, llmProviders, type LlmProvider } from "@auto-fb/shared";

export type ProviderDefinition = {
  provider: LlmProvider;
  displayName: string;
  defaultModel: string;
  envKey?: string;
  models: string[];
};

export const providerDefinitions: ProviderDefinition[] = [
  {
    provider: llmProviders.openai,
    displayName: "OpenAI",
    defaultModel: llmProviderModels.openai[0],
    envKey: "OPENAI_API_KEY",
    models: [...llmProviderModels.openai]
  },
  {
    provider: llmProviders.anthropic,
    displayName: "Anthropic Claude",
    defaultModel: llmProviderModels.anthropic[0],
    envKey: "ANTHROPIC_API_KEY",
    models: [...llmProviderModels.anthropic]
  },
  {
    provider: llmProviders.gemini,
    displayName: "Google Gemini",
    defaultModel: llmProviderModels.gemini[0],
    envKey: "GEMINI_API_KEY",
    models: [...llmProviderModels.gemini]
  },
  {
    provider: llmProviders.deepseek,
    displayName: "DeepSeek",
    defaultModel: llmProviderModels.deepseek[0],
    envKey: "DEEPSEEK_API_KEY",
    models: [...llmProviderModels.deepseek]
  },
  {
    provider: llmProviders.mock,
    displayName: "Mock local provider",
    defaultModel: llmProviderModels.mock[0],
    models: [...llmProviderModels.mock]
  }
];

export function getProviderDefinition(provider: LlmProvider): ProviderDefinition {
  const definition = providerDefinitions.find((candidate) => candidate.provider === provider);
  if (!definition) {
    throw new Error(`Unsupported LLM provider ${provider}`);
  }
  return definition;
}
