import type { ParseError } from "@/lib/types";

interface ErrorBannerProps {
  error: ParseError;
}

/** Non-blocking inline error — rendered above the output pane without ever
 * touching the input, so a bad edit never wipes out the user's work. */
export function ErrorBanner({ error }: ErrorBannerProps) {
  const location =
    error.line !== undefined
      ? ` (line ${error.line}${error.column !== undefined ? `, column ${error.column}` : ""})`
      : "";
  return (
    <div className="px-3 py-2 text-sm bg-red-50 text-red-800 border-b border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
      {error.message}
      {location}
    </div>
  );
}
