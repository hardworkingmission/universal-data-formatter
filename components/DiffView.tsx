import { diffLines } from "@/lib/diff";

const MAX_DIFF_LINES = 2000;

interface DiffViewProps {
  before: string;
  after: string;
}

const ROW_STYLE: Record<string, string> = {
  add: "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-300",
  remove: "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300",
  equal: "text-neutral-600 dark:text-neutral-400",
};
const PREFIX: Record<string, string> = { add: "+", remove: "-", equal: " " };

export function DiffView({ before, after }: DiffViewProps) {
  const beforeLines = before.split("\n").length;
  const afterLines = after.split("\n").length;

  if (beforeLines > MAX_DIFF_LINES || afterLines > MAX_DIFF_LINES) {
    return (
      <div className="p-3 text-sm text-neutral-500">
        Diff view is disabled for documents over {MAX_DIFF_LINES.toLocaleString()} lines to keep the UI responsive.
      </div>
    );
  }

  const rows = diffLines(before, after);

  return (
    <pre className="h-full overflow-auto text-xs font-mono p-2">
      {rows.map((row, i) => (
        <div key={i} className={ROW_STYLE[row.type]}>
          {PREFIX[row.type]} {row.text}
        </div>
      ))}
    </pre>
  );
}
