import type { AgentSearchResponse, LlmProvider } from "@auto-fb/shared";

export type GeneratePostInput = {
  provider: LlmProvider;
  model: string;
  topic: string;
  language: string;
  brandVoice: string;
  summary: string;
  keyFacts: string[];
  sourceUrl: string;
  instructions?: string;
};

export type GeneratePostResult = {
  text: string;
  provider: LlmProvider;
  model: string;
};

export type SearchContentInput = {
  provider: LlmProvider;
  model: string;
  query: string;
  limit: number;
};

export type SearchContentResult = AgentSearchResponse;

export interface LlmClient {
  generatePost(input: GeneratePostInput): Promise<GeneratePostResult>;
  searchContent(input: SearchContentInput): Promise<SearchContentResult>;
}
