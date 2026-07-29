export type DataFormat = "json" | "csv" | "xml" | "yaml" | "text";

export type IndentSize = 2 | 4 | "tab";

/** Line/column are 1-indexed, matching editor gutter numbering. */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseError };

export interface ActionResult {
  output: string;
  error: ParseError | null;
}

export type ActionId =
  | "prettify"
  | "minify"
  | "validate"
  | "sortKeys"
  | "convertToJson"
  | "convertToCsv"
  | "convertToYaml"
  | "convertToXml"
  | "caseUpper"
  | "caseLower"
  | "caseTitle"
  | "caseCamel"
  | "caseSnake"
  | "trimWhitespace"
  | "removeBlankLines"
  | "escapeJson"
  | "unescapeJson"
  | "escapeUrl"
  | "unescapeUrl"
  | "escapeHtml"
  | "unescapeHtml"
  | "encodeBase64"
  | "decodeBase64"
  | "sortRows"
  | "dedupeLines";
