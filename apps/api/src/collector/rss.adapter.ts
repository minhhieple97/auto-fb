import Parser from "rss-parser";
import type { Source } from "@auto-fb/shared";
import type { RawContentItem, SourceAdapter } from "./content-source.types.js";

type RssItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  creator?: string;
  pubDate?: string;
  enclosure?: { url?: string };
};

export class RssAdapter implements SourceAdapter {
  private readonly parser = new Parser<Record<string, unknown>, RssItem>();

  supports(source: Source): boolean {
    return source.type === "rss";
  }

  async collect(source: Source): Promise<RawContentItem[]> {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`RSS source ${source.url} returned ${response.status}`);
    }
    const feed = await this.parser.parseString(await response.text());
    return (feed.items ?? []).slice(0, 10).map((item) => ({
      sourceId: source.id,
      sourceUrl: item.link ?? source.url,
      title: item.title ?? "Untitled RSS item",
      text: item.contentSnippet ?? item.content ?? item.title ?? "",
      images: item.enclosure?.url ? [item.enclosure.url] : [],
      author: item.creator,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
      crawlTimestamp: new Date().toISOString()
    }));
  }
}
