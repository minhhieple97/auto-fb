import type { Source } from "@auto-fb/shared";
import type { RawContentItem, SourceAdapter } from "./content-source.types.js";

type ApiRecord = {
  url?: string;
  link?: string;
  title?: string;
  text?: string;
  content?: string;
  summary?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  author?: string;
  publishedAt?: string;
};

export class ApiAdapter implements SourceAdapter {
  supports(source: Source): boolean {
    return source.type === "api";
  }

  async collect(source: Source): Promise<RawContentItem[]> {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`API source ${source.url} returned ${response.status}`);
    }

    const payload = (await response.json()) as ApiRecord[] | { items?: ApiRecord[]; data?: ApiRecord[] };
    const records = Array.isArray(payload) ? payload : payload.items ?? payload.data ?? [];

    return records.slice(0, 10).map((record) => ({
      sourceId: source.id,
      sourceUrl: record.url ?? record.link ?? source.url,
      title: record.title ?? "Untitled API item",
      text: record.text ?? record.content ?? record.summary ?? record.title ?? "",
      images: normalizeImages(record),
      author: record.author,
      publishedAt: record.publishedAt,
      crawlTimestamp: new Date().toISOString()
    }));
  }
}

function normalizeImages(record: ApiRecord): string[] {
  if (Array.isArray(record.images)) return record.images.filter(Boolean);
  return [record.imageUrl, record.image].filter((value): value is string => Boolean(value));
}
