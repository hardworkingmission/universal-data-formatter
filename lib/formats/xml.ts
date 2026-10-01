import type { IndentSize, ParseError, ParseResult } from "../types";

function indentString(size: IndentSize): string {
  return size === "tab" ? "\t" : " ".repeat(size);
}

function extractParserError(doc: Document): ParseError | null {
  const errorNode =
    doc.getElementsByTagNameNS("http://www.mozilla.org/newlayout/xml/parsererror.xml", "parsererror")[0] ??
    doc.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "parsererror")[0];
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

function serializeElement(el: Element, depth: number, indent: string, pretty: boolean): string {
  const serializer = new XMLSerializer();
  const pad = pretty ? indent.repeat(depth) : "";
  const nodes = Array.from(el.childNodes);
  // Whitespace is significant in mixed content and under xml:space="preserve".
  // Serialize these subtrees intact, including CDATA and processing instructions.
  const hasText = nodes.some((node) =>
    node.nodeType === Node.CDATA_SECTION_NODE ||
    (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "")
  );
  if (hasText || el.getAttribute("xml:space") === "preserve" || !el.children.length) {
    return pad + serializer.serializeToString(el);
  }
  const clone = el.cloneNode(false) as Element;
  const children = nodes.filter((node) => node.nodeType !== Node.TEXT_NODE);
  // Keep namespace declarations and attributes through the native serializer.
  clone.appendChild(el.ownerDocument.createTextNode("__FORMAT_CONTENT__"));
  const shell = serializer.serializeToString(clone);
  const inner = children.map((node) => node.nodeType === Node.ELEMENT_NODE
    ? serializeElement(node as Element, depth + 1, indent, pretty)
    : (pretty ? indent.repeat(depth + 1) : "") + serializer.serializeToString(node)
  ).join(pretty ? "\n" : "");
  return pad + shell.replace(">__FORMAT_CONTENT__</", () => `>${pretty ? "\n" : ""}${inner}${pretty ? "\n" + pad : ""}</`);
}

function serializeDoc(doc: Document, indent: string, pretty: boolean): string {
  const serializer = new XMLSerializer();
  return Array.from(doc.childNodes).map((node) => node.nodeType === Node.ELEMENT_NODE
    ? serializeElement(node as Element, 0, indent, pretty)
    : serializer.serializeToString(node)
  ).join(pretty ? "\n" : "");
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
