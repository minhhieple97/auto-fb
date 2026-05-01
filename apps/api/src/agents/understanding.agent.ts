import { Inject, Injectable } from "@nestjs/common";
import type { Campaign } from "@auto-fb/shared";
import { contentHash } from "../common/hash.js";
import type { RawContentItem } from "../collector/content-source.types.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import type { UnderstoodContent } from "./agent.types.js";

@Injectable()
export class UnderstandingAgent {
  constructor(@Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository) {}

  async understand(campaign: Campaign, rawItems: RawContentItem[]): Promise<UnderstoodContent> {
    const selected = rawItems[0];
    if (!selected) throw new Error("No content item selected for understanding");

    const hash = contentHash(`${selected.title}\n${selected.text}`);
    const summary = summarize(selected.text);
    const keyFacts = extractKeyFacts(selected.text);
    const { item, duplicate } = await this.db.createContentItem({
      campaignId: campaign.id,
      sourceId: selected.sourceId,
      sourceUrl: selected.sourceUrl,
      title: selected.title,
      rawText: selected.text,
      summary,
      imageUrls: selected.images,
      hash
    });

    return { item, duplicate, summary, keyFacts };
  }
}

function summarize(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 420);
}

function extractKeyFacts(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return (sentences.length > 0 ? sentences : [text.trim()]).slice(0, 4).map((sentence) => sentence.slice(0, 220));
}
