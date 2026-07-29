import * as yaml from "js-yaml";
import type { ParseError, ParseResult } from "../types";

function toParseError(err: unknown): ParseError {
  if (err instanceof yaml.YAMLException) {
    const mark = err.mark;
    return {
      message: err.reason || err.message,
      line: mark ? mark.line + 1 : undefined,
      column: mark ? mark.column + 1 : undefined,
    };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

export function parseYaml(input: string): ParseResult<unknown> {
  try {
    return { ok: true, value: yaml.load(input) };
  } catch (err) {
    return { ok: false, error: toParseError(err) };
  }
}

export function prettifyYaml(input: string, indentSize: number): ParseResult<string> {
  const parsed = parseYaml(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: yaml.dump(parsed.value, { indent: indentSize }) };
}

/** YAML has no compact form the way JSON does, so "minify" flows to JSON-flow style. */
export function minifyYaml(input: string): ParseResult<string> {
  const parsed = parseYaml(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: yaml.dump(parsed.value, { flowLevel: 0 }).trim() };
}
