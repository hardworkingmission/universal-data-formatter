"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "@/components/Editor";
import { StatusBar } from "@/components/StatusBar";
import { ErrorBanner } from "@/components/ErrorBanner";
import { DiffView } from "@/components/DiffView";
import { SchemaPanel } from "@/components/SchemaPanel";
import { detectFormat } from "@/lib/detect";
import { runAction, ACTIONS_BY_FORMAT } from "@/lib/actions";
import { effectiveOutputFormat, fileExtension } from "@/lib/formatUtils";
import type { Preset } from "@/lib/presets";
import type { ActionId, DataFormat, IndentSize, ParseError } from "@/lib/types";

const FORMATS: DataFormat[] = ["json", "csv", "xml", "yaml", "text"];
const DEBOUNCE_MS = 300;

type ViewMode = "output" | "diff" | "schema";

export default function FormatterApp() {
  const [inputText, setInputText] = useState("");
  const [inputFormat, setInputFormat] = useState<DataFormat>("json");
  const [indent, setIndent] = useState<IndentSize>(2);
  const [lastAction, setLastAction] = useState<ActionId | null>(null);
  const [sortColumn, setSortColumn] = useState("");
  const [sortDescending, setSortDescending] = useState(false);

  const [outputText, setOutputText] = useState("");
  const [error, setError] = useState<ParseError | null>(null);
  const [ioError, setIoError] = useState<ParseError | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("output");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Follow the OS theme on first load; the toggle below overrides it for the session.
  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with OS preference on mount
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const options = useMemo(
    () => ({ indent, sortColumn, sortDescending }),
    [indent, sortColumn, sortDescending]
  );

  const process = useCallback(
    (text: string) => {
      if (!lastAction) {
        setOutputText(text);
        setError(null);
        return;
      }
      const result = runAction(inputFormat, lastAction, text, options);
      setOutputText(result.output);
      setError(result.error);
    },
    [lastAction, inputFormat, options]
  );

  // Debounced live parsing while typing, so 10k+ line documents don't re-parse on every keystroke.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => process(inputText), DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText]);

  // Immediate (non-debounced) reprocessing when the action/format/options change via UI controls.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: re-run on action/format/option change
    process(inputText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [process]);

  const outputFormat = error ? inputFormat : effectiveOutputFormat(inputFormat, lastAction);
  const activeViewMode = viewMode === "schema" && outputFormat !== "json" ? "output" : viewMode;
  const availableActions = ACTIONS_BY_FORMAT[inputFormat];

  const handleRunAction = (action: ActionId) => {
    clearTimeout(debounceTimer.current);
    setLastAction(action);
    const result = runAction(inputFormat, action, inputText, options);
    setOutputText(result.output);
    setError(result.error);
  };

  const handleFormatChange = (format: DataFormat) => {
    setInputFormat(format);
    setLastAction(null);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text");
    if (text) {
      setInputFormat(detectFormat(text));
      setLastAction(null);
    }
  }, []);

  const loadFile = useCallback((file: File) => {
    setIoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setInputText(text);
      setInputFormat(detectFormat(text));
      setLastAction(null);
    };
    reader.onerror = () => setIoError({ message: "Unable to read this file. Please try again." });
    reader.readAsText(file);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = "";
  };

  const handleSwap = () => {
    setInputText(outputText);
    setInputFormat(outputFormat);
    setLastAction(null);
    setError(null);
  };

  const handleCopy = async () => {
    setIoError(null);
    try {
      await navigator.clipboard.writeText(outputText);
    } catch {
      setIoError({ message: "Clipboard access failed. Select and copy the output manually." });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([outputText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `output.${fileExtension(outputFormat)}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSavePreset = () => {
    if (!lastAction) return;
    const preset: Preset = {
      id: `${Date.now()}`,
      label: `${inputFormat} → ${ACTIONS_BY_FORMAT[inputFormat].find((a) => a.id === lastAction)?.label ?? lastAction}`,
      format: inputFormat,
      action: lastAction,
    };
    setPresets((prev) => [...prev, preset]);
  };

  const applyPreset = (preset: Preset) => {
    setInputFormat(preset.format);
    setLastAction(preset.action);
  };

  // Ctrl/Cmd+Enter re-runs the last-used action against the current (non-debounced) input.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        clearTimeout(debounceTimer.current);
        process(inputText);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [process, inputText]);

  const needsSortColumn = lastAction === "sortRows";
  const viewModes: ViewMode[] = outputFormat === "json" ? ["output", "diff", "schema"] : ["output", "diff"];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-sm font-semibold">Universal Data Formatter</h1>
        <button
          onClick={() => setDarkMode((d) => !d)}
          className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800"
        >
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 text-xs">
        <label className="flex items-center gap-1">
          Format:
          <select
            value={inputFormat}
            onChange={(e) => handleFormatChange(e.target.value as DataFormat)}
            className="border rounded px-1 py-0.5 bg-transparent border-neutral-300 dark:border-neutral-700"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1">
          Indent:
          <select
            value={String(indent)}
            onChange={(e) => setIndent(e.target.value === "tab" ? "tab" : (Number(e.target.value) as IndentSize))}
            className="border rounded px-1 py-0.5 bg-transparent border-neutral-300 dark:border-neutral-700"
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-1">
          {availableActions.map((a) => (
            <button
              key={a.id}
              onClick={() => handleRunAction(a.id)}
              className={`px-2 py-1 rounded border ${
                lastAction === a.id
                  ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {needsSortColumn && (
          <div className="flex items-center gap-1">
            <input
              placeholder="column / key"
              aria-label="Sort column or key"
              value={sortColumn}
              onChange={(e) => setSortColumn(e.target.value)}
              className="border rounded px-1 py-0.5 bg-transparent border-neutral-300 dark:border-neutral-700 w-28"
            />
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={sortDescending} onChange={(e) => setSortDescending(e.target.checked)} />
              desc
            </label>
          </div>
        )}

        <button
          onClick={handleSavePreset}
          disabled={!lastAction}
          className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-40"
        >
          Save preset
        </button>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 py-1 border-b border-neutral-200 dark:border-neutral-800 text-xs">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
        <section
          className={`flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 ${
            dragActive ? "outline outline-2 outline-blue-400" : ""
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onPaste={handlePaste}
        >
          <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-neutral-200 dark:border-neutral-800">
            <span>Input ({inputFormat.toUpperCase()}) — drag &amp; drop a file, or paste to auto-detect</span>
            <label className="cursor-pointer px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
              Upload
              <input type="file" className="hidden" onChange={handleFileInput} />
            </label>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              value={inputText}
              onChange={setInputText}
              format={inputFormat}
              darkMode={darkMode}
              placeholder="Paste, type, or drop a file here…"
            />
          </div>
          <StatusBar text={inputText} />
        </section>

        <section className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex gap-1">
              {viewModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-0.5 rounded ${
                    activeViewMode === mode
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  {mode === "output" ? "Output" : mode === "diff" ? "Diff" : "Schema"}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={handleSwap} className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                Swap ⇄
              </button>
              <button onClick={handleCopy} className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                Copy
              </button>
              <button onClick={handleDownload} className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                Download
              </button>
            </div>
          </div>

          {error && <ErrorBanner error={error} />}
          {ioError && <ErrorBanner error={ioError} />}

          <div className="flex-1 min-h-0">
            {activeViewMode === "output" && <Editor value={outputText} format={outputFormat} readOnly darkMode={darkMode} />}
            {activeViewMode === "diff" && <DiffView before={inputText} after={outputText} />}
            {activeViewMode === "schema" && <SchemaPanel jsonInput={outputText} />}
          </div>
          <StatusBar text={outputText} />
        </section>
      </main>
    </div>
  );
}
