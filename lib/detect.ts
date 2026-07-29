import type { DataFormat } from "./types";

/**
 * Cheap heuristic sniffing, run on paste/drop to pick a default format.
 * Order matters: JSON and XML have unambiguous leading characters, so they
 * are checked before the fuzzier CSV/YAML heuristics.
 */
export function detectFormat(input: string): DataFormat {
  const trimmed = input.trim();
  if (!trimmed) return "text";

  if (trimmed[0] === "{" || trimmed[0] === "[") {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // fall through — might still "look like" JSON but be malformed
    }
  }

  if (trimmed[0] === "<") return "xml";

  const lines = trimmed.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length > 0) {
    const commaCounts = lines.slice(0, 5).map((l) => (l.match(/,/g) ?? []).length);
    const consistentCommas =
      commaCounts.length > 1 &&
      commaCounts[0] > 0 &&
      commaCounts.every((c) => c === commaCounts[0]);
    if (consistentCommas) return "csv";
  }

  const yamlHints = /^(---\s*$|[\w.-]+:\s|-\s+\S)/m;
  if (yamlHints.test(trimmed) && !trimmed.includes("{")) return "yaml";

  return "text";
}
