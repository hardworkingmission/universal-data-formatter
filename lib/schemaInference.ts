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

function tsTypeName(value: unknown, name: string, out: string[]): string {
  const t = typeOf(value);
  switch (t) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array": {
      const arr = value as unknown[];
      if (arr.length === 0) return "unknown[]";
      const elType = tsTypeName(arr[0], name, out);
      return `${elType}[]`;
    }
    case "object":
      return buildInterface(value as Record<string, unknown>, name, out);
    default:
      return "unknown";
  }
}

function pascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
}

function buildInterface(obj: Record<string, unknown>, name: string, out: string[]): string {
  const interfaceName = pascalCase(name) || "Root";
  const fields = Object.entries(obj)
    .map(([key, val]) => `  ${key}: ${tsTypeName(val, key, out)};`)
    .join("\n");
  out.push(`interface ${interfaceName} {\n${fields}\n}`);
  return interfaceName;
}

/** Generates a best-effort TypeScript interface from a sample JSON value. */
export function inferTypeScript(input: string): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;

  const value = parsed.value;
  const out: string[] = [];

  if (Array.isArray(value)) {
    if (value.length === 0) return { ok: true, value: "type Root = unknown[];" };
    tsTypeName(value[0], "Root", out);
    out.push("type Root = RootItem[];".replace("RootItem", pascalCase("Root")));
    return { ok: true, value: out.join("\n\n") };
  }
  if (value !== null && typeof value === "object") {
    buildInterface(value as Record<string, unknown>, "Root", out);
    return { ok: true, value: out.reverse().join("\n\n") };
  }
  return { ok: true, value: `type Root = ${typeOf(value)};` };
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
      return { type: "array", items: arr.length > 0 ? jsonSchemaType(arr[0]) : {} };
    }
    case "object": {
      const obj = value as Record<string, unknown>;
      const properties: Record<string, unknown> = {};
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
