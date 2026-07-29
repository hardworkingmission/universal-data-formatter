/** Format-agnostic line-level operations, usable on any pane content. */

export function trimWhitespace(input: string): string {
  return input
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function removeBlankLines(input: string): string {
  return input
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

export function dedupeLines(input: string): string {
  const seen = new Set<string>();
  return input
    .split("\n")
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join("\n");
}
