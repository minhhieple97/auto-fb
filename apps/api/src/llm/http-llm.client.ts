import { llmProviders, type LlmProvider } from "@auto-fb/shared";
import { llmDefaults, llmEndpoints } from "./llm.constants.js";
import type { GeneratePostInput, GeneratePostResult, LlmClient, SearchContentInput, SearchContentResult } from "./llm.types.js";

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

  async searchContent(input: SearchContentInput): Promise<SearchContentResult> {
    if (this.options.provider !== llmProviders.gemini) {
      throw new Error(`Search agent is not supported for ${this.options.provider}`);
    }
    return this.callGeminiSearch(input);
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

  private async callGeminiSearch(input: SearchContentInput): Promise<SearchContentResult> {
    const response = await fetch(
      llmEndpoints.googleGenerateContent(input.model, this.options.apiKey),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildSearchPrompt(input) }] }],
          tools: [{ google_search: {} }]
        })
      }
    );
    const payload = (await response.json()) as GeminiGenerateContentResponse;
    if (!response.ok) throw new Error(payload.error?.message ?? `Gemini returned ${response.status}`);

    const candidate = payload.candidates?.[0];
    return {
      query: input.query,
      provider: input.provider,
      model: input.model,
      searchQueries: candidate?.groundingMetadata?.webSearchQueries ?? [input.query],
      results: buildGroundedSearchResults(candidate, input.limit),
      ...(candidate?.groundingMetadata?.searchEntryPoint?.renderedContent
        ? { searchEntryPointHtml: candidate.groundingMetadata.searchEntryPoint.renderedContent }
        : {})
    };
  }
}

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
  groundingMetadata?: {
    webSearchQueries?: string[];
    searchEntryPoint?: {
      renderedContent?: string;
    };
    groundingChunks?: Array<{
      web?: {
        uri?: string;
        title?: string;
      };
    }>;
    groundingSupports?: Array<{
      segment?: {
        text?: string;
      };
      groundingChunkIndices?: number[];
    }>;
  };
};

function buildSystemPrompt(input: GeneratePostInput): string {
  return [
    "You are a careful Facebook Page copywriter.",
    `Write in ${input.language}.`,
    `Brand voice: ${input.brandVoice}.`,
    "Do not invent facts. Include source attribution. Avoid sensitive claims."
  ].join(" ");
}

function buildUserPrompt(input: GeneratePostInput): string {
  const prompt = [
    `Topic: ${input.topic}`,
    `Summary: ${input.summary}`,
    `Key facts:\n${input.keyFacts.map((fact) => `- ${fact}`).join("\n")}`,
    `Source URL: ${input.sourceUrl}`,
    "Create one Facebook post. Keep it concise and useful."
  ];
  if (input.instructions) {
    prompt.push(`Additional instructions: ${input.instructions}`);
  }
  return prompt.join("\n\n");
}

function buildSearchPrompt(input: SearchContentInput): string {
  return [
    `Search the web for useful source pages about: ${input.query}`,
    `Find up to ${input.limit} highly relevant candidate sources for a Facebook Page post.`,
    "Prioritize credible primary or reputable sources, recent information when timing matters, and direct relevance.",
    "Do not write the Facebook post yet. Return a concise ranked source list with one-sentence context for each result."
  ].join("\n\n");
}

function buildGroundedSearchResults(candidate: GeminiCandidate | undefined, limit: number): SearchContentResult["results"] {
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const supports = candidate?.groundingMetadata?.groundingSupports ?? [];
  const seenUrls = new Set<string>();
  const results: SearchContentResult["results"] = [];

  for (let index = 0; index < chunks.length && results.length < limit; index += 1) {
    const web = chunks[index]?.web;
    const url = web?.uri;
    if (!url || seenUrls.has(url)) continue;

    seenUrls.add(url);
    const title = sanitizeText(web?.title) || hostFromUrl(url);
    results.push({
      id: `result-${results.length + 1}`,
      title,
      url,
      snippet: snippetForChunk(index, supports),
      sourceName: hostFromUrl(url)
    });
  }

  return results;
}

function snippetForChunk(chunkIndex: number, supports: NonNullable<GeminiCandidate["groundingMetadata"]>["groundingSupports"] = []): string {
  const support = supports.find((item) => item.groundingChunkIndices?.includes(chunkIndex) && item.segment?.text);
  return sanitizeText(support?.segment?.text);
}

function sanitizeText(value: string | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
