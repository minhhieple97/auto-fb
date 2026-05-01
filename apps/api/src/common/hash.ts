import { createHash } from "node:crypto";

export function normalizeForDedupe(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contentHash(input: string): string {
  return createHash("sha256").update(normalizeForDedupe(input)).digest("hex");
}
