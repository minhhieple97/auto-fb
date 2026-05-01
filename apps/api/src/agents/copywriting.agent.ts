import { Inject, Injectable } from "@nestjs/common";
import type { Campaign } from "@auto-fb/shared";
import { LlmService } from "../llm/llm.service.js";
import type { UnderstoodContent } from "./agent.types.js";

@Injectable()
export class CopywritingAgent {
  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async write(campaign: Campaign, understood: UnderstoodContent): Promise<string> {
    const result = await this.llm.generatePost({
      provider: campaign.llmProvider,
      model: campaign.llmModel,
      topic: campaign.topic,
      language: campaign.language,
      brandVoice: campaign.brandVoice,
      summary: understood.summary,
      keyFacts: understood.keyFacts,
      sourceUrl: understood.item.sourceUrl
    });
    if (!result.text.trim()) {
      throw new Error("LLM returned empty post text");
    }
    return result.text.trim();
  }
}
