export const llmDefaults = {
  anthropicVersion: "2023-06-01",
  maxKeyFactsInMockPost: 3,
  maxTokens: 700,
  temperature: 0.7
} as const;

export const llmEndpoints = {
  anthropicMessages: "https://api.anthropic.com/v1/messages",
  deepseekChatCompletions: "https://api.deepseek.com/chat/completions",
  googleGenerateContent: (model: string, apiKey: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
  openAiChatCompletions: "https://api.openai.com/v1/chat/completions"
} as const;
