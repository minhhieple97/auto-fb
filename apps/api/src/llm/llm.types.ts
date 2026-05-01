import type { LlmProvider } from "@auto-fb/shared";

export type GeneratePostInput = {
  provider: LlmProvider;
  model: string;
  topic: string;
  language: string;
  brandVoice: string;
  summary: string;
  keyFacts: string[];
  sourceUrl: string;
};

export type GeneratePostResult = {
  text: string;
  provider: LlmProvider;
  model: string;
};

export interface LlmClient {
  generatePost(input: GeneratePostInput): Promise<GeneratePostResult>;
}
