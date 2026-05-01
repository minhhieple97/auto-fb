import * as cheerio from "cheerio";
import { sourceTypes, type Source } from "@auto-fb/shared";
import { collectorLimits } from "./collector.constants.js";
import type { RawContentItem, SourceAdapter } from "./content-source.types.js";

type ParsedCurl = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | undefined;
};

export class CurlAdapter implements SourceAdapter {
  supports(source: Source): boolean {
    return source.type === sourceTypes.curl;
  }

  async collect(source: Source): Promise<RawContentItem[]> {
    const metadata = source.metadata as { curlCommand?: string } | undefined;
    const curlCommand = metadata?.curlCommand;
    if (!curlCommand) {
      throw new Error(`cURL source ${source.id} has no curlCommand in metadata`);
    }

    const parsed = parseCurl(curlCommand);
    const response = await fetch(parsed.url, {
      method: parsed.method,
      headers: parsed.headers,
      ...(parsed.body ? { body: parsed.body } : {})
    });
    if (!response.ok) {
      throw new Error(`cURL source ${source.id} returned ${response.status} from ${parsed.url}`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return this.parseJsonResponse(source, parsed.url, response);
    }

    return this.parseHtmlResponse(source, parsed.url, response);
  }

  private async parseJsonResponse(source: Source, url: string, response: Response): Promise<RawContentItem[]> {
    type JsonRecord = {
      url?: string;
      link?: string;
      title?: string;
      text?: string;
      content?: string;
      summary?: string;
    };

    const payload = (await response.json()) as JsonRecord[] | { items?: JsonRecord[]; data?: JsonRecord[] };
    const records = Array.isArray(payload) ? payload : payload.items ?? payload.data ?? [];

    if (records.length === 0) {
      return [
        {
          sourceId: source.id,
          sourceUrl: url,
          title: `cURL JSON response`,
          text: JSON.stringify(payload).slice(0, collectorLimits.staticHtmlTextPreviewCharacters),
          images: [],
          crawlTimestamp: new Date().toISOString()
        }
      ];
    }

    return records.slice(0, collectorLimits.maxItemsPerSource).map((record) => ({
      sourceId: source.id,
      sourceUrl: record.url ?? record.link ?? url,
      title: record.title ?? "Untitled cURL item",
      text: record.text ?? record.content ?? record.summary ?? record.title ?? "",
      images: [],
      crawlTimestamp: new Date().toISOString()
    }));
  }

  private async parseHtmlResponse(source: Source, url: string, response: Response): Promise<RawContentItem[]> {
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
        sourceUrl: url,
        title: title.trim(),
        text: description.replace(/\s+/g, " ").trim().slice(0, collectorLimits.staticHtmlTextPreviewCharacters),
        images: image ? [new URL(image, url).toString()] : [],
        crawlTimestamp: new Date().toISOString()
      }
    ];
  }
}

export function parseCurl(curlCommand: string): ParsedCurl {
  const normalized = curlCommand
    .replace(/\\\n/g, " ")
    .replace(/\\\r\n/g, " ")
    .trim();

  const tokens = tokenize(normalized);
  const headers: Record<string, string> = {};
  let method = "GET";
  let url = "";
  let body: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    if (token === "curl") continue;

    if (token === "-X" || token === "--request") {
      method = tokens[++i]?.toUpperCase() ?? method;
      continue;
    }

    if (token === "-H" || token === "--header") {
      const headerValue = tokens[++i];
      if (headerValue) {
        const colonIndex = headerValue.indexOf(":");
        if (colonIndex > 0) {
          const key = headerValue.slice(0, colonIndex).trim();
          const value = headerValue.slice(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
      continue;
    }

    if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      body = tokens[++i];
      if (method === "GET") method = "POST";
      continue;
    }

    if (token.startsWith("-")) {
      if (!token.startsWith("--compressed") && !token.startsWith("--insecure") && !token.startsWith("-k") && !token.startsWith("-s") && !token.startsWith("--silent") && !token.startsWith("-L") && !token.startsWith("--location") && !token.startsWith("-v") && !token.startsWith("--verbose")) {
        i++;
      }
      continue;
    }

    if (!url && (token.startsWith("http://") || token.startsWith("https://") || token.startsWith("'"))) {
      url = token;
    }
  }

  if (!url) {
    throw new Error("Could not extract URL from cURL command");
  }

  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
  }

  return { url, method, headers, body };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if ((char === " " || char === "\t") && !inSingleQuote && !inDoubleQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
