import { llmProviderModels, llmProviders } from "@auto-fb/shared";
import { llmDefaults } from "./llm.constants.js";
import type { GeneratePostInput, GeneratePostResult, LlmClient } from "./llm.types.js";

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
}
