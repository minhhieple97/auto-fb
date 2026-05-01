import { sourceDefaults, sourceTypeSchema, sourceTypes, type CreateSourceInput } from "@auto-fb/shared";
import { FileText, Globe, Rss, Sparkles, Terminal } from "lucide-react";
import { z } from "zod";
import { sourceTypeOptions } from "./source-options.js";

/** Props shared by all source-creation tab components. */
export type SourceTabProps = {
  fanpageId: string | undefined;
  canCreate: boolean;
  onSuccess: () => void;
};

/** URL-based source types (excludes curl and gemini_search). */
export const urlSourceTypeOptions = sourceTypeOptions.filter(
  (o) => o.value !== sourceTypes.curl && o.value !== sourceTypes.geminiSearch
);

/** Zod schema for the URL source creation form. */
export const sourceFormSchema = z.object({
  type: sourceTypeSchema,
  url: z.string().trim().url("Enter a valid source URL."),
  crawlPolicy: z.string().min(1),
  enabled: z.boolean()
});

/** Default values for the URL source creation form. */
export const sourceDefaultValues: CreateSourceInput = {
  type: sourceDefaults.type,
  url: "",
  crawlPolicy: sourceDefaults.crawlPolicy,
  enabled: sourceDefaults.enabled
};

/** Maps source type to its display icon. */
const SOURCE_ICON_MAP: Record<string, React.ElementType> = {
  [sourceTypes.rss]: Rss,
  [sourceTypes.api]: Globe,
  [sourceTypes.staticHtml]: FileText,
  [sourceTypes.curl]: Terminal,
  [sourceTypes.geminiSearch]: Sparkles
};

/** Returns the icon component for a given source type. */
export function getSourceIcon(type: string): React.ElementType {
  return SOURCE_ICON_MAP[type] ?? Rss;
}

/** Truncates a cURL command string for display. */
export function truncateCurl(curl: string | undefined): string {
  if (!curl) return "—";
  const maxLength = 80;
  return curl.length > maxLength ? `${curl.slice(0, maxLength - 3)}...` : curl;
}
