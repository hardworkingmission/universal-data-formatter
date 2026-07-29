"use client";

import { useState } from "react";
import { inferTypeScript, inferJsonSchema } from "@/lib/schemaInference";

interface SchemaPanelProps {
  jsonInput: string;
}

/** Infers a TypeScript interface or JSON Schema from the current JSON input. Only
 * shown when the input pane is JSON, since inference needs a concrete sample value. */
export function SchemaPanel({ jsonInput }: SchemaPanelProps) {
  const [mode, setMode] = useState<"ts" | "schema">("ts");

  const result = mode === "ts" ? inferTypeScript(jsonInput) : inferJsonSchema(jsonInput);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setMode("ts")}
          className={`text-xs px-2 py-1 rounded ${mode === "ts" ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-800"}`}
        >
          TypeScript
        </button>
        <button
          onClick={() => setMode("schema")}
          className={`text-xs px-2 py-1 rounded ${mode === "schema" ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-800"}`}
        >
          JSON Schema
        </button>
      </div>
      {result.ok ? (
        <pre className="flex-1 overflow-auto text-xs font-mono p-3">{result.value}</pre>
      ) : (
        <div className="p-3 text-sm text-red-600 dark:text-red-400">
          Can&apos;t infer a schema: {result.error.message}
        </div>
      )}
    </div>
  );
}
