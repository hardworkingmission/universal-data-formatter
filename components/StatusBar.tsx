interface StatusBarProps {
  text: string;
}

export function StatusBar({ text }: StatusBarProps) {
  const lines = text.length === 0 ? 0 : text.split("\n").length;
  const chars = text.length;
  return (
    <div className="px-3 py-1 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
      <span>{lines.toLocaleString()} lines</span>
      <span>{chars.toLocaleString()} chars</span>
    </div>
  );
}
