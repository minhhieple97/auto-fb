import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiAdapter } from "../src/collector/api.adapter.js";
import { CollectorService } from "../src/collector/collector.service.js";
import { RssAdapter } from "../src/collector/rss.adapter.js";
import { StaticHtmlAdapter } from "../src/collector/static-html.adapter.js";
import { buildSource, jsonResponse, textResponse } from "./helpers.js";

describe("collector adapters", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("collects JSON API records from array and object payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        items: [{ link: "https://example.com/item", title: "Item", summary: "Summary", images: ["", "https://example.com/a.png"] }]
      })
    );

    const items = await new ApiAdapter().collect(buildSource({ type: "api" }));

    expect(items).toMatchObject([
      {
        sourceId: "src_1",
        sourceUrl: "https://example.com/item",
        title: "Item",
        text: "Summary",
        images: ["https://example.com/a.png"]
      }
    ]);
  });

  it("limits API records and surfaces non-OK responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(
        Array.from({ length: 12 }, (_, index) => ({
          url: `https://example.com/${index}`,
          title: `Item ${index}`
        }))
      )
    );

    expect(await new ApiAdapter().collect(buildSource({ type: "api" }))).toHaveLength(10);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ error: "nope" }, { status: 503 }));
    await expect(new ApiAdapter().collect(buildSource({ type: "api" }))).rejects.toThrow(
      "API source https://example.com/api returned 503"
    );
  });

  it("collects RSS metadata and normalizes publication dates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      textResponse(
        `<rss version="2.0"><channel><title>Feed</title><link>https://example.com</link><description>Example feed</description><item><title>RSS title</title><link>https://example.com/rss</link><description>RSS body</description><pubDate>Fri, 01 May 2026 00:00:00 GMT</pubDate><enclosure url="https://example.com/rss.png" /></item></channel></rss>`,
        "application/rss+xml"
      )
    );

    const items = await new RssAdapter().collect(buildSource({ type: "rss", url: "https://example.com/feed.xml" }));

    expect(items[0]).toMatchObject({
      sourceUrl: "https://example.com/rss",
      title: "RSS title",
      text: "RSS body",
      images: ["https://example.com/rss.png"],
      publishedAt: "2026-05-01T00:00:00.000Z"
    });
  });

  it("collects static HTML metadata and resolves relative image URLs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      textResponse(
        `<html><head><title>Fallback title</title><meta property="og:title" content="OG title"><meta property="og:description" content="Description"><meta property="og:image" content="/image.jpg"></head><body>Ignored body</body></html>`
      )
    );

    const items = await new StaticHtmlAdapter().collect(buildSource({ type: "static_html", url: "https://example.com/page" }));

    expect(items[0]).toMatchObject({
      sourceUrl: "https://example.com/page",
      title: "OG title",
      text: "Description",
      images: ["https://example.com/image.jpg"]
    });
  });
});

describe("CollectorService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("collects only enabled whitelist HTTP sources", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse([{ title: "Item", text: "Text" }]));
    const service = new CollectorService();

    const items = await service.collect([
      buildSource({ id: "src_enabled", url: "https://example.com/api", enabled: true }),
      buildSource({ id: "src_disabled", url: "https://example.com/disabled", enabled: false })
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ sourceId: "src_enabled", title: "Item" });
  });

  it("rejects unsupported crawl policies, protocols and source types", async () => {
    const service = new CollectorService();

    await expect(service.collect([buildSource({ crawlPolicy: "follow_links" })])).rejects.toThrow(
      "Unsupported crawl policy follow_links"
    );
    await expect(service.collect([buildSource({ url: "ftp://example.com/feed" })])).rejects.toThrow(
      "Unsupported source protocol ftp:"
    );
    await expect(service.collect([buildSource({ type: "unknown" as never })])).rejects.toThrow("No adapter for source type unknown");
  });
});
