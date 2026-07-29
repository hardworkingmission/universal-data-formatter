import type { ParseResult } from "../types";

/** Plain text has no structure to validate; these exist so the action
 * dispatcher can treat every format uniformly. */
export function parseText(input: string): ParseResult<string> {
  return { ok: true, value: input };
}
