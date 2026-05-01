import { llmProviderModels, llmProviders } from "@auto-fb/shared";
import { llmDefaults } from "./llm.constants.js";
import type { GeneratePostInput, GeneratePostResult, LlmClient, SearchContentInput, SearchContentResult } from "./llm.types.js";

export class MockLlmClient implements LlmClient {
  async generatePost(input: GeneratePostInput): Promise<GeneratePostResult> {
    const facts = input.keyFacts.slice(0, llmDefaults.maxKeyFactsInMockPost).map((fact) => `- ${fact}`).join("\n");
    const text = [
      `Goc nhin nhanh ve ${input.topic}`,
      "",
      input.summary,
      "",
      facts,
      "",
      `Nguon: ${input.sourceUrl}`
    ]
      .filter(Boolean)
      .join("\n");

    return {
      text,
      provider: llmProviders.mock,
      model: llmProviderModels.mock[0]
    };
  }

  async searchContent(input: SearchContentInput): Promise<SearchContentResult> {
    const count = Math.min(input.limit, llmDefaults.maxMockSearchResults);
    return {
      query: input.query,
      provider: llmProviders.mock,
      model: llmProviderModels.mock[0],
      searchQueries: [input.query],
      results: Array.from({ length: count }, (_, index) => {
        const rank = index + 1;
        return {
          id: `mock-search-${rank}`,
          title: `Mock source ${rank} for ${input.query}`,
          url: `https://example.com/search/${rank}`,
          snippet: `Mock search snippet ${rank} for ${input.query}.`,
          sourceName: "example.com"
        };
      })
    };
  }
}
