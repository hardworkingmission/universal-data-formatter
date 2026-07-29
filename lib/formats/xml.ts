import type { IndentSize, ParseError, ParseResult } from "../types";

function indentString(size: IndentSize): string {
  return size === "tab" ? "\t" : " ".repeat(size);
}

function extractParserError(doc: Document): ParseError | null {
  const errorNode = doc.getElementsByTagName("parsererror")[0];
  if (!errorNode) return null;
  const message = errorNode.textContent ?? "Malformed XML";
  const lineMatch = message.match(/line[:\s]+(\d+)/i);
  const columnMatch = message.match(/column[:\s]+(\d+)/i);
  return {
    message: message.trim().split("\n")[0] || "Malformed XML",
    line: lineMatch ? Number(lineMatch[1]) : undefined,
    column: columnMatch ? Number(columnMatch[1]) : undefined,
  };
}

/** Real XML parsing via DOMParser — no regex-based tag matching. */
export function parseXml(input: string): ParseResult<Document> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "application/xml");
  const error = extractParserError(doc);
  if (error) return { ok: false, error };
  return { ok: true, value: doc };
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return escapeText(text).replace(/"/g, "&quot;");
}

function serializeElement(el: Element, depth: number, indent: string, pretty: boolean): string {
  const pad = pretty ? indent.repeat(depth) : "";
  const nl = pretty ? "\n" : "";

  const attrs = Array.from(el.attributes)
    .map((a) => ` ${a.name}="${escapeAttr(a.value)}"`)
    .join("");

  const children = Array.from(el.childNodes).filter((n) => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? "").trim().length > 0;
    return true;
  });

  if (children.length === 0) {
    return `${pad}<${el.tagName}${attrs}/>${nl}`;
  }

  const onlyText =
    children.length === 1 && children[0].nodeType === Node.TEXT_NODE;
  if (onlyText) {
    const text = escapeText((children[0].textContent ?? "").trim());
    return `${pad}<${el.tagName}${attrs}>${text}</${el.tagName}>${nl}`;
  }

  const inner = children
    .map((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        return serializeElement(child as Element, depth + 1, indent, pretty);
      }
      if (child.nodeType === Node.COMMENT_NODE) {
        return `${pretty ? indent.repeat(depth + 1) : ""}<!--${child.textContent}-->${nl}`;
      }
      return "";
    })
    .join("");

  return `${pad}<${el.tagName}${attrs}>${nl}${inner}${pad}</${el.tagName}>${nl}`;
}

function serializeDoc(doc: Document, indent: string, pretty: boolean): string {
  if (!doc.documentElement) return "";
  return serializeElement(doc.documentElement, 0, indent, pretty).trimEnd();
}

export function prettifyXml(input: string, indent: IndentSize): ParseResult<string> {
  const parsed = parseXml(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: serializeDoc(parsed.value, indentString(indent), true) };
}

export function minifyXml(input: string): ParseResult<string> {
  const parsed = parseXml(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: serializeDoc(parsed.value, "", false) };
}
