import { Inject, Injectable } from "@nestjs/common";
import type { Source } from "@auto-fb/shared";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";

@Injectable()
export class SourceDiscoveryAgent {
  constructor(@Inject(InMemoryDatabase) private readonly db: InMemoryDatabase) {}

  async discover(campaignId: string): Promise<Source[]> {
    const sources = this.db.listSources(campaignId).filter((source) => source.enabled);
    if (sources.length === 0) {
      throw new Error("Campaign has no enabled whitelist sources");
    }
    return sources;
  }
}
