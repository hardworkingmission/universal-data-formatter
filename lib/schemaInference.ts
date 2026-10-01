import type { ParseResult } from "./types";
import { parseJson } from "./formats/json";

type JsType = "string" | "number" | "boolean" | "null" | "object" | "array" | "any";

function typeOf(value: unknown): JsType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "object") return "object";
  return "any";
}

function tsTypeName(value: unknown, depth = 0): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const types = [...new Set(value.map((item) => tsTypeName(item, depth)))];
    return `(${types.join(" | ")})[]`;
  }
  if (value !== null && typeof value === "object") {
    const pad = "  ".repeat(depth);
    const fields = Object.entries(value)
      .map(([key, val]) => `${pad}  ${JSON.stringify(key)}: ${tsTypeName(val, depth + 1)};`)
      .join("\n");
    return `{\n${fields}\n${pad}}`;
  }
  return typeOf(value);
}

/** Generates a TypeScript type covering every value in the sample. */
export function inferTypeScript(input: string): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  const type = tsTypeName(parsed.value);
  const isObject = parsed.value !== null && typeof parsed.value === "object" && !Array.isArray(parsed.value);
  return { ok: true, value: isObject ? `interface Root ${type}` : `type Root = ${type};` };
}

function jsonSchemaType(value: unknown): Record<string, unknown> {
  const t = typeOf(value);
  switch (t) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "null":
      return { type: "null" };
    case "array": {
      const arr = value as unknown[];
      const schemas = [...new Set(arr.map((item) => JSON.stringify(jsonSchemaType(item))))]
        .map((schema) => JSON.parse(schema));
      return { type: "array", items: schemas.length === 0 ? {} : schemas.length === 1 ? schemas[0] : { anyOf: schemas } };
    }
    case "object": {
      const obj = value as Record<string, unknown>;
      const properties: Record<string, unknown> = Object.create(null);
      Object.entries(obj).forEach(([k, v]) => {
        properties[k] = jsonSchemaType(v);
      });
      return {
        type: "object",
        properties,
        required: Object.keys(obj),
      };
    }
    default:
      return {};
  }
}

/** Generates a best-effort JSON Schema (draft 2020-12) from a sample JSON value. */
export function inferJsonSchema(input: string): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...jsonSchemaType(parsed.value),
  };
  return { ok: true, value: JSON.stringify(schema, null, 2) };
}
