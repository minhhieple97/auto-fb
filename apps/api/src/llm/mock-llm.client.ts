import type { GeneratePostInput, GeneratePostResult, LlmClient } from "./llm.types.js";

export class MockLlmClient implements LlmClient {
  async generatePost(input: GeneratePostInput): Promise<GeneratePostResult> {
    const facts = input.keyFacts.slice(0, 3).map((fact) => `- ${fact}`).join("\n");
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
      provider: "mock",
      model: "mock-copywriter-v1"
    };
  }
}
