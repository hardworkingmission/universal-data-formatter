import type { IndentSize, ParseError, ParseResult } from "../types";

function indentString(size: IndentSize): string {
  return size === "tab" ? "\t" : " ".repeat(size);
}

/** Turns a V8 "position N" JSON.parse error into a 1-indexed line/column. */
function locateFromPosition(input: string, position: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < position && i < input.length; i++) {
    if (input[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

function toParseError(err: unknown, input: string): ParseError {
  const rawMessage = err instanceof Error ? err.message : String(err);
  // V8 embeds the location in the message itself; strip it since ErrorBanner renders it separately.
  const message = rawMessage.replace(/\s*\(line \d+ column \d+\)\s*$/i, "").trim();

  const lineColMatch = rawMessage.match(/line (\d+) column (\d+)/i);
  if (lineColMatch) {
    return { message, line: Number(lineColMatch[1]), column: Number(lineColMatch[2]) };
  }

  const positionMatch = rawMessage.match(/position (\d+)/i);
  if (positionMatch) {
    const { line, column } = locateFromPosition(input, Number(positionMatch[1]));
    return { message, line, column };
  }

  return { message };
}

export function parseJson(input: string): ParseResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (err) {
    return { ok: false, error: toParseError(err, input) };
  }
}

export function prettifyJson(input: string, indent: IndentSize): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: JSON.stringify(parsed.value, null, indentString(indent)) };
}

export function minifyJson(input: string): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: JSON.stringify(parsed.value) };
}

/** Recursively sorts object keys alphabetically; arrays and scalars are left as-is. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeysDeep(v)]));
  }
  return value;
}

export function sortJsonKeys(input: string, indent: IndentSize): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: JSON.stringify(sortKeysDeep(parsed.value), null, indentString(indent)) };
}
