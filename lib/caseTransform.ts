/** Splits on whitespace/underscore/hyphen and camel-case boundaries. */
function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean);
}

export function toUpperCase(input: string): string {
  return input.toUpperCase();
}

export function toLowerCase(input: string): string {
  return input.toLowerCase();
}

/** Title-cases each whitespace-separated word; punctuation-adjacent runs are left alone. */
export function toTitleCase(input: string): string {
  return input.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function camelCaseLine(line: string): string {
  const words = splitWords(line).map((w) => w.toLowerCase());
  if (words.length === 0) return line;
  return words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
}

function snakeCaseLine(line: string): string {
  return splitWords(line)
    .map((w) => w.toLowerCase())
    .join("_");
}

/** Applied per line so multi-line input keeps its line breaks instead of merging into one word. */
export function toCamelCase(input: string): string {
  return input.split("\n").map(camelCaseLine).join("\n");
}

export function toSnakeCase(input: string): string {
  return input.split("\n").map(snakeCaseLine).join("\n");
}
