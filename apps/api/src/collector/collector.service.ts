import { Injectable } from "@nestjs/common";
import { sourceDefaults, type Source } from "@auto-fb/shared";
import { ApiAdapter } from "./api.adapter.js";
import { allowedSourceProtocols } from "./collector.constants.js";
import type { RawContentItem, SourceAdapter } from "./content-source.types.js";
import { RssAdapter } from "./rss.adapter.js";
import { StaticHtmlAdapter } from "./static-html.adapter.js";

@Injectable()
export class CollectorService {
  private readonly adapters: SourceAdapter[] = [new RssAdapter(), new ApiAdapter(), new StaticHtmlAdapter()];

  async collect(sources: Source[]): Promise<RawContentItem[]> {
    const enabledSources = sources.filter((source) => source.enabled);
    const results = await Promise.all(enabledSources.map((source) => this.collectSource(source)));
    return results.flat();
  }

  private async collectSource(source: Source): Promise<RawContentItem[]> {
    assertWhitelistedSource(source);
    const adapter = this.adapters.find((candidate) => candidate.supports(source));
    if (!adapter) {
      throw new Error(`No adapter for source type ${source.type}`);
    }

    return adapter.collect(source);
  }
}

function assertWhitelistedSource(source: Source): void {
  if (source.crawlPolicy !== sourceDefaults.crawlPolicy) {
    throw new Error(`Unsupported crawl policy ${source.crawlPolicy}`);
  }
  const url = new URL(source.url);
  if (!allowedSourceProtocols.includes(url.protocol as (typeof allowedSourceProtocols)[number])) {
    throw new Error(`Unsupported source protocol ${url.protocol}`);
  }
}
