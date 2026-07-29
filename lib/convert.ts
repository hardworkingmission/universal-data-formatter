import * as yaml from "js-yaml";
import Papa from "papaparse";
import { parseJson } from "./formats/json";
import { parseCsv, type CsvTable } from "./formats/csv";
import { parseXml } from "./formats/xml";
import { parseYaml } from "./formats/yaml";
import type { IndentSize, ParseResult } from "./types";

function indentString(size: IndentSize): string {
  return size === "tab" ? "\t" : " ".repeat(size);
}

// ---------- JSON <-> CSV ----------

function coerceCsvValue(raw: string): string | number | boolean | null {
  if (raw === "") return "";
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

export function jsonToCsv(input: string): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;

  const rows: unknown[] = Array.isArray(parsed.value) ? parsed.value : [parsed.value];
  const isFlatObjects = rows.every((r) => r !== null && typeof r === "object" && !Array.isArray(r));

  if (isFlatObjects) {
    const fieldSet = new Set<string>();
    rows.forEach((r) => Object.keys(r as Record<string, unknown>).forEach((k) => fieldSet.add(k)));
    const fields = Array.from(fieldSet);
    const data = rows.map((r) => {
      const obj = r as Record<string, unknown>;
      const out: Record<string, string> = {};
      fields.forEach((f) => {
        const v = obj[f];
        out[f] = v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      });
      return out;
    });
    return { ok: true, value: Papa.unparse({ fields, data }) };
  }

  // Array of primitives (or a single primitive) — fall back to one "value" column.
  const data = rows.map((v) => ({ value: v === null || v === undefined ? "" : String(v) }));
  return { ok: true, value: Papa.unparse({ fields: ["value"], data }) };
}

export function csvToJson(input: string, indent: IndentSize): ParseResult<string> {
  const parsed = parseCsv(input);
  if (!parsed.ok) return parsed;
  const objects = parsed.value.rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[k] = coerceCsvValue(v);
    return out;
  });
  return { ok: true, value: JSON.stringify(objects, null, indentString(indent)) };
}

// ---------- JSON <-> YAML ----------

export function jsonToYaml(input: string, indentSize: number): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: yaml.dump(parsed.value, { indent: indentSize }) };
}

export function yamlToJson(input: string, indent: IndentSize): ParseResult<string> {
  const parsed = parseYaml(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: JSON.stringify(parsed.value, null, indentString(indent)) };
}

// ---------- JSON <-> XML ----------

const XML_ATTR_PREFIX = "@";
const XML_TEXT_KEY = "#text";

function isValidTagName(name: string): boolean {
  return /^[A-Za-z_][\w.-]*$/.test(name);
}

function jsonValueToXml(key: string, value: unknown, depth: number, indent: string): string {
  const pad = indent.repeat(depth);
  const tag = isValidTagName(key) ? key : "item";

  if (Array.isArray(value)) {
    return value.map((item) => jsonValueToXml(tag, item, depth, indent)).join("");
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const attrs = entries
      .filter(([k]) => k.startsWith(XML_ATTR_PREFIX))
      .map(([k, v]) => ` ${k.slice(1)}="${String(v).replace(/"/g, "&quot;")}"`)
      .join("");
    const children = entries.filter(([k]) => !k.startsWith(XML_ATTR_PREFIX) && k !== XML_TEXT_KEY);
    const textEntry = entries.find(([k]) => k === XML_TEXT_KEY);

    if (children.length === 0 && !textEntry) {
      return `${pad}<${tag}${attrs}/>\n`;
    }
    if (children.length === 0 && textEntry) {
      return `${pad}<${tag}${attrs}>${String(textEntry[1])}</${tag}>\n`;
    }
    const inner = children.map(([k, v]) => jsonValueToXml(k, v, depth + 1, indent)).join("");
    return `${pad}<${tag}${attrs}>\n${inner}${pad}</${tag}>\n`;
  }

  const text = value === null || value === undefined ? "" : String(value);
  return `${pad}<${tag}>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</${tag}>\n`;
}

export function jsonToXml(input: string, indentSize: IndentSize): ParseResult<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  const indent = indentString(indentSize);
  const root = parsed.value;
  if (Array.isArray(root)) {
    const inner = root.map((item) => jsonValueToXml("item", item, 1, indent)).join("");
    return { ok: true, value: `<root>\n${inner}</root>` };
  }
  return { ok: true, value: jsonValueToXml("root", root, 0, indent).trimEnd() };
}

function xmlNodeToJson(el: Element): unknown {
  const attrs = Array.from(el.attributes);
  const childElements = Array.from(el.children);
  const textContent = Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? "")
    .join("")
    .trim();

  if (attrs.length === 0 && childElements.length === 0) {
    return textContent;
  }

  const obj: Record<string, unknown> = {};
  attrs.forEach((a) => {
    obj[XML_ATTR_PREFIX + a.name] = a.value;
  });

  const grouped = new Map<string, unknown[]>();
  childElements.forEach((child) => {
    const value = xmlNodeToJson(child);
    const list = grouped.get(child.tagName) ?? [];
    list.push(value);
    grouped.set(child.tagName, list);
  });
  grouped.forEach((values, tag) => {
    obj[tag] = values.length === 1 ? values[0] : values;
  });

  if (textContent && childElements.length === 0) {
    obj[XML_TEXT_KEY] = textContent;
  }

  return obj;
}

export function xmlToJson(input: string, indentSize: IndentSize): ParseResult<string> {
  const parsed = parseXml(input);
  if (!parsed.ok) return parsed;
  const root = parsed.value.documentElement;
  if (!root) return { ok: false, error: { message: "XML document has no root element." } };
  const value = { [root.tagName]: xmlNodeToJson(root) };
  return { ok: true, value: JSON.stringify(value, null, indentString(indentSize)) };
}

export type { CsvTable };
