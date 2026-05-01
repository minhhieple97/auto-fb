export const textProcessingLimits = {
  summaryMaxChars: 420,
  maxKeyFacts: 4,
  keyFactMaxChars: 220
} as const;

export function summarize(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, textProcessingLimits.summaryMaxChars);
}

export function extractKeyFacts(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const source = sentences.length > 0 ? sentences : [text.trim()];
  return source
    .slice(0, textProcessingLimits.maxKeyFacts)
    .map((sentence) => sentence.slice(0, textProcessingLimits.keyFactMaxChars));
}

const combiningDiacriticsPattern = /[̀-ͯ]/g;

export function normalizeVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(combiningDiacriticsPattern, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
