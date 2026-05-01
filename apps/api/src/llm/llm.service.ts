import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { llmProviders, type LlmProvider } from "@auto-fb/shared";
import { envKeys, nodeEnvironments } from "../common/app.constants.js";
import { HttpLlmClient } from "./http-llm.client.js";
import type { GeneratePostInput, GeneratePostResult, LlmClient } from "./llm.types.js";
import { MockLlmClient } from "./mock-llm.client.js";
import { getProviderDefinition, providerDefinitions } from "./provider-registry.js";

@Injectable()
export class LlmService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  listProviders() {
    return providerDefinitions;
  }

  async generatePost(input: GeneratePostInput): Promise<GeneratePostResult> {
    const client = this.createClient(input.provider);
    return client.generatePost(input);
  }

  createClient(provider: LlmProvider): LlmClient {
    if (provider === llmProviders.mock) return new MockLlmClient();
    const definition = getProviderDefinition(provider);
    const apiKey = definition.envKey ? this.config.get<string>(definition.envKey) : undefined;
    if (!apiKey) {
      if (this.config.get<string>(envKeys.nodeEnv) === nodeEnvironments.production) {
        throw new Error(`Missing ${definition.envKey} for ${provider}`);
      }
      return new MockLlmClient();
    }

    return new HttpLlmClient({ provider, apiKey });
  }
}
