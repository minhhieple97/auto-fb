import { Inject, Injectable } from "@nestjs/common";
import type { Source } from "@auto-fb/shared";
import { CollectorService } from "../collector/collector.service.js";
import type { RawContentItem } from "../collector/content-source.types.js";
import { retryPolicies, withResilience } from "../common/retry.js";

@Injectable()
export class CollectorAgent {
  constructor(@Inject(CollectorService) private readonly collector: CollectorService) {}

  async collect(sources: Source[]): Promise<RawContentItem[]> {
    const items = await withResilience(() => this.collector.collect(sources), {
      label: "collector.collect",
      ...retryPolicies.collector
    });
    const usableItems = items.filter((item) => item.text.trim().length > 0);
    if (usableItems.length === 0) {
      throw new Error("No usable content found from enabled sources");
    }
    return usableItems;
  }
}
