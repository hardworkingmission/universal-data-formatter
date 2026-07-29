import Papa from "papaparse";
import type { ParseError, ParseResult } from "../types";

export interface CsvTable {
  fields: string[];
  rows: Record<string, string>[];
}

/**
 * Wraps Papa Parse (handles quoted commas/newlines and escaped quotes
 * properly, unlike a naive split(",")).
 */
export function parseCsv(input: string): ParseResult<CsvTable> {
  const result = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    const error: ParseError = {
      message: first.message,
      line: typeof first.row === "number" ? first.row + 2 : undefined,
    };
    return { ok: false, error };
  }

  return {
    ok: true,
    value: { fields: result.meta.fields ?? [], rows: result.data },
  };
}

export function stringifyCsv(table: CsvTable): string {
  return Papa.unparse({ fields: table.fields, data: table.rows });
}

export function prettifyCsv(input: string): ParseResult<string> {
  const parsed = parseCsv(input);
  if (!parsed.ok) return parsed;
  // "Prettify" for CSV means normalizing to aligned, quoted-when-needed output.
  return { ok: true, value: stringifyCsv(parsed.value) };
}

export function minifyCsv(input: string): ParseResult<string> {
  const parsed = parseCsv(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: stringifyCsv(parsed.value) };
}

export function sortCsvRows(input: string, column: string, descending = false): ParseResult<string> {
  const parsed = parseCsv(input);
  if (!parsed.ok) return parsed;
  const { fields, rows } = parsed.value;
  if (!fields.includes(column)) {
    return { ok: false, error: { message: `Column "${column}" not found in CSV header.` } };
  }
  const sorted = [...rows].sort((a, b) => {
    const av = a[column] ?? "";
    const bv = b[column] ?? "";
    const an = Number(av);
    const bn = Number(bv);
    const cmp =
      !Number.isNaN(an) && !Number.isNaN(bn) && av !== "" && bv !== ""
        ? an - bn
        : av.localeCompare(bv);
    return descending ? -cmp : cmp;
  });
  return { ok: true, value: stringifyCsv({ fields, rows: sorted }) };
}

export function dedupeCsvRows(input: string): ParseResult<string> {
  const parsed = parseCsv(input);
  if (!parsed.ok) return parsed;
  const { fields, rows } = parsed.value;
  const seen = new Set<string>();
  const deduped = rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ok: true, value: stringifyCsv({ fields, rows: deduped }) };
}
