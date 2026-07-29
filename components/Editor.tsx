"use client";

import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DataFormat } from "@/lib/types";

function languageExtension(format: DataFormat) {
  switch (format) {
    case "json":
      return json();
    case "xml":
      return xml();
    case "yaml":
      return yaml();
    default:
      return [];
  }
}

interface EditorProps {
  value: string;
  onChange?: (value: string) => void;
  format: DataFormat;
  readOnly?: boolean;
  darkMode: boolean;
  placeholder?: string;
}

/**
 * Thin CodeMirror wrapper. CodeMirror virtualizes rendering internally, so
 * 10k+ line documents stay responsive without any extra work here — the
 * expensive part (parsing) is debounced by the caller instead.
 */
export function Editor({ value, onChange, format, readOnly = false, darkMode, placeholder }: EditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={darkMode ? oneDark : "light"}
      extensions={[languageExtension(format), EditorView.lineWrapping]}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: !readOnly,
      }}
      style={{ height: "100%", fontSize: "13px" }}
      className="h-full overflow-auto"
    />
  );
}
