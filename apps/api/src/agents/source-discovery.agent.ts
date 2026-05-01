import { Inject, Injectable } from "@nestjs/common";
import type { Source } from "@auto-fb/shared";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";

@Injectable()
export class SourceDiscoveryAgent {
  constructor(@Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository) {}

  async discover(campaignId: string): Promise<Source[]> {
    const sources = (await this.db.listSources(campaignId)).filter((source) => source.enabled);
    if (sources.length === 0) {
      throw new Error("Campaign has no enabled whitelist sources");
    }
    return sources;
  }
}
