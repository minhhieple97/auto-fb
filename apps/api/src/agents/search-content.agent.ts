import { Inject, Injectable } from "@nestjs/common";
import {
  approvalStatuses,
  draftStatuses,
  sourceTypes,
  type AgentSearchInput,
  type AgentSearchResponse,
  type Campaign,
  type GenerateFromSearchInput,
  type GenerateFromSearchResponse
} from "@auto-fb/shared";
import { contentHash } from "../common/hash.js";
import { LlmService } from "../llm/llm.service.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { QaComplianceAgent } from "./qa-compliance.agent.js";
import type { UnderstoodContent } from "./agent.types.js";
import { summarize } from "./text-utils.js";

const SELECTED_RESULT_KEY_FACT_MAX_CHARS = 240;
const SEARCH_TITLE_MAX_CHARS = 180;

@Injectable()
export class SearchContentAgent {
  constructor(
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(QaComplianceAgent) private readonly qa: QaComplianceAgent
  ) {}

  async search(campaignId: string, input: AgentSearchInput): Promise<AgentSearchResponse> {
    await this.db.getCampaign(campaignId);
    return this.llm.searchContent(input);
  }

  async generate(campaignId: string, input: GenerateFromSearchInput): Promise<GenerateFromSearchResponse> {
    const campaign = await this.db.getCampaign(campaignId);
    const source = await this.db.createSource(campaign.id, {
      type: sourceTypes.staticHtml,
      url: input.selectedResults[0]!.url,
      crawlPolicy: "user_selected_search",
      enabled: false
    });
    const rawText = selectedResultsToRawText(input);
    const summary = summarize(rawText);
    const keyFacts = input.selectedResults.map((result, index) =>
      [`${index + 1}. ${result.title}`, result.snippet, `Source: ${result.url}`]
        .filter(Boolean)
        .join(" - ")
        .slice(0, SELECTED_RESULT_KEY_FACT_MAX_CHARS)
    );
    const { item, duplicate } = await this.db.createContentItem({
      campaignId: campaign.id,
      sourceId: source.id,
      sourceUrl: input.selectedResults[0]!.url,
      title: titleForSelectedResults(input),
      rawText,
      summary,
      imageUrls: [],
      hash: contentHash(rawText)
    });
    const understood: UnderstoodContent = { item, duplicate, summary, keyFacts };
    const draftText = await this.generatePost(campaign, understood, input);
    const qa = await this.qa.check({ understood, draftText });
    const draft = await this.db.createDraft({
      campaignId: campaign.id,
      contentItemId: item.id,
      text: draftText,
      status: draftStatuses.pendingApproval,
      riskScore: qa.riskScore,
      riskFlags: qa.riskFlags,
      approvalStatus: approvalStatuses.pending
    });

    return { draft, contentItem: item, duplicate };
  }

  private async generatePost(campaign: Campaign, understood: UnderstoodContent, input: GenerateFromSearchInput): Promise<string> {
    const result = await this.llm.generatePost({
      provider: input.provider,
      model: input.model,
      topic: campaign.topic,
      language: campaign.language,
      brandVoice: campaign.brandVoice,
      summary: understood.summary,
      keyFacts: understood.keyFacts,
      sourceUrl: understood.item.sourceUrl,
      instructions: [
        "Use only the selected search results as source material.",
        "Mention or include source URLs when useful for attribution.",
        input.instructions
      ]
        .filter(Boolean)
        .join(" ")
    });
    if (!result.text.trim()) {
      throw new Error("LLM returned empty post text");
    }
    return result.text.trim();
  }
}

function selectedResultsToRawText(input: GenerateFromSearchInput): string {
  return input.selectedResults
    .map((result, index) =>
      [`Result ${index + 1}: ${result.title}`, `URL: ${result.url}`, result.snippet ? `Snippet: ${result.snippet}` : undefined]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function titleForSelectedResults(input: GenerateFromSearchInput): string {
  if (input.selectedResults.length === 1) {
    return input.selectedResults[0]!.title.slice(0, SEARCH_TITLE_MAX_CHARS);
  }
  return `${input.selectedResults.length} selected search results`.slice(0, SEARCH_TITLE_MAX_CHARS);
}
