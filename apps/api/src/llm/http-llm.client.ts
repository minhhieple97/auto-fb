import { llmProviders, type LlmProvider } from "@auto-fb/shared";
import { llmDefaults, llmEndpoints } from "./llm.constants.js";
import type { GeneratePostInput, GeneratePostResult, LlmClient } from "./llm.types.js";

type HttpClientOptions = {
  provider: LlmProvider;
  apiKey: string;
};

export class HttpLlmClient implements LlmClient {
  constructor(private readonly options: HttpClientOptions) {}

  async generatePost(input: GeneratePostInput): Promise<GeneratePostResult> {
    if (this.options.provider === llmProviders.anthropic) {
      return this.callAnthropic(input);
    }
    if (this.options.provider === llmProviders.gemini) {
      return this.callGemini(input);
    }
    return this.callOpenAiCompatible(input);
  }

  private async callOpenAiCompatible(input: GeneratePostInput): Promise<GeneratePostResult> {
    const baseUrl = input.provider === llmProviders.deepseek ? llmEndpoints.deepseekChatCompletions : llmEndpoints.openAiChatCompletions;
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.apiKey}`
      },
      body: JSON.stringify({
        model: input.model,
        temperature: llmDefaults.temperature,
        messages: [
          { role: "system", content: buildSystemPrompt(input) },
          { role: "user", content: buildUserPrompt(input) }
        ]
      })
    });
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? `LLM provider returned ${response.status}`);
    return {
      text: payload.choices?.[0]?.message?.content?.trim() ?? "",
      provider: input.provider,
      model: input.model
    };
  }

  private async callAnthropic(input: GeneratePostInput): Promise<GeneratePostResult> {
    const response = await fetch(llmEndpoints.anthropicMessages, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.options.apiKey,
        "anthropic-version": llmDefaults.anthropicVersion
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: llmDefaults.maxTokens,
        system: buildSystemPrompt(input),
        messages: [{ role: "user", content: buildUserPrompt(input) }]
      })
    });
    const payload = (await response.json()) as { content?: Array<{ text?: string }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? `Anthropic returned ${response.status}`);
    return {
      text: payload.content?.map((part) => part.text).filter(Boolean).join("\n").trim() ?? "",
      provider: input.provider,
      model: input.model
    };
  }

  private async callGemini(input: GeneratePostInput): Promise<GeneratePostResult> {
    const response = await fetch(
      llmEndpoints.googleGenerateContent(input.model, this.options.apiKey),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${buildSystemPrompt(input)}\n\n${buildUserPrompt(input)}` }] }]
        })
      }
    );
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(payload.error?.message ?? `Gemini returned ${response.status}`);
    return {
      text: payload.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n").trim() ?? "",
      provider: input.provider,
      model: input.model
    };
  }
}

function buildSystemPrompt(input: GeneratePostInput): string {
  return [
    "You are a careful Facebook Page copywriter.",
    `Write in ${input.language}.`,
    `Brand voice: ${input.brandVoice}.`,
    "Do not invent facts. Include source attribution. Avoid sensitive claims."
  ].join(" ");
}

function buildUserPrompt(input: GeneratePostInput): string {
  return [
    `Topic: ${input.topic}`,
    `Summary: ${input.summary}`,
    `Key facts:\n${input.keyFacts.map((fact) => `- ${fact}`).join("\n")}`,
    `Source URL: ${input.sourceUrl}`,
    "Create one Facebook post. Keep it concise and useful."
  ].join("\n\n");
}
