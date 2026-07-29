import type { ParseResult } from "./types";

export function escapeJsonString(input: string): string {
  return JSON.stringify(input).slice(1, -1);
}

export function unescapeJsonString(input: string): ParseResult<string> {
  // Accept both a bare escaped body ("line\n") and a fully quoted literal ("\"line\\n\"").
  const body = input.trim().startsWith('"') && input.trim().endsWith('"') ? input.trim() : `"${input}"`;
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch (err) {
    return { ok: false, error: { message: err instanceof Error ? err.message : "Invalid escaped string" } };
  }
}

export function escapeUrl(input: string): string {
  return encodeURIComponent(input);
}

export function unescapeUrl(input: string): ParseResult<string> {
  try {
    return { ok: true, value: decodeURIComponent(input) };
  } catch (err) {
    return { ok: false, error: { message: err instanceof Error ? err.message : "Invalid percent-encoding" } };
  }
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const HTML_UNESCAPES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function unescapeHtml(input: string): string {
  return input.replace(/&(amp|lt|gt|quot|#39|apos);/g, (entity) => HTML_UNESCAPES[entity]);
}

export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function decodeBase64(input: string): ParseResult<string> {
  try {
    const binary = atob(input.trim());
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch (err) {
    return { ok: false, error: { message: err instanceof Error ? err.message : "Invalid Base64 input" } };
  }
}
