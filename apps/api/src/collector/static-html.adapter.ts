import * as cheerio from "cheerio";
import type { Source } from "@auto-fb/shared";
import type { RawContentItem, SourceAdapter } from "./content-source.types.js";

export class StaticHtmlAdapter implements SourceAdapter {
  supports(source: Source): boolean {
    return source.type === "static_html";
  }

  async collect(source: Source): Promise<RawContentItem[]> {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`HTML source ${source.url} returned ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("meta[property='og:title']").attr("content") ?? $("title").text() ?? "Untitled page";
    const description =
      $("meta[property='og:description']").attr("content") ??
      $("meta[name='description']").attr("content") ??
      $("article").text() ??
      $("body").text();
    const image = $("meta[property='og:image']").attr("content");

    return [
      {
        sourceId: source.id,
        sourceUrl: source.url,
        title: title.trim(),
        text: description.replace(/\s+/g, " ").trim().slice(0, 5000),
        images: image ? [new URL(image, source.url).toString()] : [],
        crawlTimestamp: new Date().toISOString()
      }
    ];
  }
}
