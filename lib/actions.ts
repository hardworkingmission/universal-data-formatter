import type { ActionId, ActionResult, DataFormat, IndentSize } from "./types";
import { parseJson, prettifyJson, minifyJson, sortJsonKeys, sortKeysDeep } from "./formats/json";
import { parseCsv, prettifyCsv, minifyCsv, sortCsvRows, dedupeCsvRows } from "./formats/csv";
import { parseXml, prettifyXml, minifyXml } from "./formats/xml";
import { parseYaml, prettifyYaml, minifyYaml } from "./formats/yaml";
import { jsonToCsv, csvToJson, jsonToYaml, yamlToJson, jsonToXml, xmlToJson } from "./convert";
import { toUpperCase, toLowerCase, toTitleCase, toCamelCase, toSnakeCase } from "./caseTransform";
import { escapeJsonString, unescapeJsonString, escapeUrl, unescapeUrl, escapeHtml, unescapeHtml, encodeBase64, decodeBase64 } from "./escape";
import { trimWhitespace, removeBlankLines, dedupeLines } from "./textOps";

export interface ActionOptions {
  indent: IndentSize;
  sortColumn?: string;
  sortDescending?: boolean;
}

/** Which actions make sense to offer for a given input format, in display order. */
export const ACTIONS_BY_FORMAT: Record<DataFormat, { id: ActionId; label: string }[]> = {
  json: [
    { id: "prettify", label: "Prettify" },
    { id: "minify", label: "Minify" },
    { id: "validate", label: "Validate" },
    { id: "sortKeys", label: "Sort keys (A–Z)" },
    { id: "sortRows", label: "Sort array by key" },
    { id: "dedupeLines", label: "De-dupe array items" },
    { id: "convertToCsv", label: "Convert → CSV" },
    { id: "convertToYaml", label: "Convert → YAML" },
    { id: "convertToXml", label: "Convert → XML" },
  ],
  csv: [
    { id: "prettify", label: "Prettify" },
    { id: "minify", label: "Minify" },
    { id: "validate", label: "Validate" },
    { id: "sortRows", label: "Sort rows by column" },
    { id: "dedupeLines", label: "De-dupe rows" },
    { id: "convertToJson", label: "Convert → JSON" },
  ],
  xml: [
    { id: "prettify", label: "Prettify" },
    { id: "minify", label: "Minify" },
    { id: "validate", label: "Validate" },
    { id: "convertToJson", label: "Convert → JSON" },
  ],
  yaml: [
    { id: "prettify", label: "Prettify" },
    { id: "minify", label: "Minify" },
    { id: "validate", label: "Validate" },
    { id: "convertToJson", label: "Convert → JSON" },
  ],
  text: [
    { id: "trimWhitespace", label: "Trim whitespace" },
    { id: "removeBlankLines", label: "Remove blank lines" },
    { id: "dedupeLines", label: "De-dupe lines" },
    { id: "caseUpper", label: "UPPERCASE" },
    { id: "caseLower", label: "lowercase" },
    { id: "caseTitle", label: "Title Case" },
    { id: "caseCamel", label: "camelCase" },
    { id: "caseSnake", label: "snake_case" },
    { id: "escapeJson", label: "Escape (JSON string)" },
    { id: "unescapeJson", label: "Unescape (JSON string)" },
    { id: "escapeUrl", label: "Escape (URL)" },
    { id: "unescapeUrl", label: "Unescape (URL)" },
    { id: "escapeHtml", label: "Escape (HTML entities)" },
    { id: "unescapeHtml", label: "Unescape (HTML entities)" },
    { id: "encodeBase64", label: "Base64 encode" },
    { id: "decodeBase64", label: "Base64 decode" },
  ],
};

function validateFormat(format: DataFormat, input: string): ActionResult {
  const result =
    format === "json" ? parseJson(input) :
    format === "csv" ? parseCsv(input) :
    format === "xml" ? parseXml(input) :
    format === "yaml" ? parseYaml(input) :
    ({ ok: true, value: input } as const);

  if (!result.ok) return { output: input, error: result.error };
  return { output: `Valid ${format.toUpperCase()}.`, error: null };
}

function sortRowsGeneric(format: DataFormat, input: string, options: ActionOptions): ActionResult {
  if (format === "csv") {
    const column = options.sortColumn ?? "";
    const result = sortCsvRows(input, column, options.sortDescending ?? false);
    return result.ok ? { output: result.value, error: null } : { output: input, error: result.error };
  }
  if (format === "json") {
    const parsed = parseJson(input);
    if (!parsed.ok) return { output: input, error: parsed.error };
    if (!Array.isArray(parsed.value)) {
      return { output: input, error: { message: "Sort by column requires a JSON array." } };
    }
    const column = options.sortColumn;
    const sorted = [...parsed.value].sort((a, b) => {
      const av = column && a && typeof a === "object" ? (a as Record<string, unknown>)[column] : a;
      const bv = column && b && typeof b === "object" ? (b as Record<string, unknown>)[column] : b;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return options.sortDescending ? -cmp : cmp;
    });
    return { output: JSON.stringify(sorted, null, options.indent === "tab" ? "\t" : " ".repeat(options.indent)), error: null };
  }
  return { output: input, error: { message: `Sort by column isn't supported for ${format}.` } };
}

function dedupeGeneric(format: DataFormat, input: string, options: ActionOptions): ActionResult {
  if (format === "csv") {
    const result = dedupeCsvRows(input);
    return result.ok ? { output: result.value, error: null } : { output: input, error: result.error };
  }
  if (format === "json") {
    const parsed = parseJson(input);
    if (!parsed.ok) return { output: input, error: parsed.error };
    if (!Array.isArray(parsed.value)) {
      return { output: input, error: { message: "De-dupe requires a JSON array." } };
    }
    const seen = new Set<string>();
    const deduped = parsed.value.filter((item) => {
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { output: JSON.stringify(deduped, null, options.indent === "tab" ? "\t" : " ".repeat(options.indent)), error: null };
  }
  return { output: dedupeLines(input), error: null };
}

function wrapText(fn: (s: string) => string, input: string): ActionResult {
  try {
    return { output: fn(input), error: null };
  } catch (err) {
    return { output: input, error: { message: err instanceof Error ? err.message : "Operation failed" } };
  }
}

function wrapParseResult(result: { ok: true; value: string } | { ok: false; error: { message: string; line?: number; column?: number } }, input: string): ActionResult {
  return result.ok ? { output: result.value, error: null } : { output: input, error: result.error };
}

/** Central dispatcher: given the current pane format + chosen action, produce the next output. */
export function runAction(format: DataFormat, action: ActionId, input: string, options: ActionOptions): ActionResult {
  const { indent } = options;

  switch (action) {
    case "prettify":
      if (format === "json") return wrapParseResult(prettifyJson(input, indent), input);
      if (format === "csv") return wrapParseResult(prettifyCsv(input), input);
      if (format === "xml") return wrapParseResult(prettifyXml(input, indent), input);
      if (format === "yaml") return wrapParseResult(prettifyYaml(input, indent === "tab" ? 2 : indent), input);
      return { output: input, error: null };

    case "minify":
      if (format === "json") return wrapParseResult(minifyJson(input), input);
      if (format === "csv") return wrapParseResult(minifyCsv(input), input);
      if (format === "xml") return wrapParseResult(minifyXml(input), input);
      if (format === "yaml") return wrapParseResult(minifyYaml(input), input);
      return { output: input, error: null };

    case "validate":
      return validateFormat(format, input);

    case "sortKeys": {
      if (format !== "json") return { output: input, error: { message: "Sort keys only applies to JSON." } };
      return wrapParseResult(sortJsonKeys(input, indent), input);
    }

    case "sortRows":
      return sortRowsGeneric(format, input, options);

    case "dedupeLines":
      return dedupeGeneric(format, input, options);

    case "convertToJson": {
      if (format === "csv") return wrapParseResult(csvToJson(input, indent), input);
      if (format === "xml") return wrapParseResult(xmlToJson(input, indent), input);
      if (format === "yaml") return wrapParseResult(yamlToJson(input, indent), input);
      return { output: input, error: null };
    }
    case "convertToCsv":
      return wrapParseResult(jsonToCsv(input), input);
    case "convertToYaml":
      return wrapParseResult(jsonToYaml(input, indent === "tab" ? 2 : indent), input);
    case "convertToXml":
      return wrapParseResult(jsonToXml(input, indent), input);

    case "caseUpper":
      return wrapText(toUpperCase, input);
    case "caseLower":
      return wrapText(toLowerCase, input);
    case "caseTitle":
      return wrapText(toTitleCase, input);
    case "caseCamel":
      return wrapText(toCamelCase, input);
    case "caseSnake":
      return wrapText(toSnakeCase, input);

    case "trimWhitespace":
      return wrapText(trimWhitespace, input);
    case "removeBlankLines":
      return wrapText(removeBlankLines, input);

    case "escapeJson":
      return wrapText(escapeJsonString, input);
    case "unescapeJson":
      return wrapParseResult(unescapeJsonString(input), input);
    case "escapeUrl":
      return wrapText(escapeUrl, input);
    case "unescapeUrl":
      return wrapParseResult(unescapeUrl(input), input);
    case "escapeHtml":
      return wrapText(escapeHtml, input);
    case "unescapeHtml":
      return wrapText(unescapeHtml, input);
    case "encodeBase64":
      return wrapText(encodeBase64, input);
    case "decodeBase64":
      return wrapParseResult(decodeBase64(input), input);

    default:
      return { output: input, error: { message: `Unknown action: ${action}` } };
  }
}

export { sortKeysDeep };
