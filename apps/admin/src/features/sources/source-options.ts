import { sourceTypes } from "@auto-fb/shared";

export const sourceTypeOptions = [
  { label: "RSS", value: sourceTypes.rss },
  { label: "JSON API", value: sourceTypes.api },
  { label: "Static HTML", value: sourceTypes.staticHtml }
] as const;
