import type { Source } from "@auto-fb/shared";

export type RawContentItem = {
  sourceId: string;
  sourceUrl: string;
  title: string;
  text: string;
  images: string[];
  author?: string | undefined;
  publishedAt?: string | undefined;
  license?: string | undefined;
  crawlTimestamp: string;
};

export interface SourceAdapter {
  supports(source: Source): boolean;
  collect(source: Source): Promise<RawContentItem[]>;
}
