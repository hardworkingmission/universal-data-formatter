# Universal Data Formatter

A client-side tool for converting, validating, and beautifying structured
data — JSON, CSV, XML, YAML, and plain text. Everything runs in the
browser; no input ever leaves the page.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run build && npm run start` produces a production build; `npm run lint` runs ESLint.

## Usage

1. **Get data in.** Paste it, type it, drag a file onto the input pane, or click "Upload". Pasting auto-detects the format (JSON/CSV/XML/YAML/text); override it any time with the Format selector.
2. **Pick an action.** The action bar changes based on the input format — e.g. JSON gets Prettify/Minify/Validate/Sort keys/Convert, while plain text gets case transforms and escape/unescape helpers.
3. **Read the output.** The right pane shows the result, with line/column-accurate error messages if the input doesn't parse. A parse error never clears your input.
4. **Copy, download, or swap.** "Swap ⇄" moves the output back into the input pane (handy for chaining conversions), "Copy" hits the clipboard, "Download" saves a file with the right extension.
5. **Diff and Schema tabs.** "Diff" shows a line-level diff between input and output. "Schema" (JSON output only) infers a TypeScript interface or JSON Schema from the current value.
6. **Presets.** After running an action, "Save preset" remembers that format + action combo for the rest of the session (in-memory only, not persisted to disk/localStorage).
7. **Ctrl/Cmd+Enter** re-runs the last action against the current input immediately, without waiting for the debounce.

## Supported operations

- Prettify / minify, with 2-space, 4-space, or tab indentation
- Validate, with line/column-accurate syntax errors
- Sort object keys recursively (JSON) or array items by key/column (JSON array, CSV)
- Convert JSON ↔ CSV, JSON ↔ YAML, JSON ↔ XML
- Case transforms: UPPERCASE, lowercase, Title Case, camelCase, snake_case
- Trim whitespace, remove blank lines, de-duplicate lines/rows/items
- Escape/unescape: JSON string, URL, HTML entities, Base64

## Design notes

- **Real parsers, not regex.** CSV goes through [PapaParse](https://www.papaparse.com/) (handles quoted commas and escaped quotes); XML goes through the browser's `DOMParser`/`XMLSerializer`; YAML goes through [js-yaml](https://github.com/nodeca/js-yaml).
- **CodeMirror 6** (`@uiw/react-codemirror`) powers both panes for syntax highlighting. CodeMirror virtualizes its own rendering, so large documents (10k+ lines) stay responsive.
- **Debounced parsing.** Typing updates the input pane instantly, but re-parsing is debounced ~300ms so a large paste doesn't parse on every keystroke. Clicking an action button or changing the format/indent runs immediately, bypassing the debounce.
- **Never throws to the console.** Every parser/converter returns a `{ ok, value | error }` result instead of throwing; the UI renders errors inline and leaves the input untouched.
- **Nothing is sent anywhere.** No network calls, no backend. Format/action/preset state lives only in React state for the session — closing the tab clears it.

## Project layout

```
app/page.tsx           Main app: state, layout, wiring
components/            Editor pane, status bar, error banner, diff view, schema panel
lib/
  types.ts             Shared types (DataFormat, ActionId, ParseResult, ...)
  detect.ts            Format auto-detection heuristic
  actions.ts            Dispatches an ActionId to the right operation for the current format
  convert.ts            JSON ↔ CSV / YAML / XML conversion
  caseTransform.ts       UPPERCASE / lowercase / Title Case / camelCase / snake_case
  escape.ts              JSON string / URL / HTML entity / Base64 escape-unescape
  textOps.ts             Trim whitespace, remove blank lines, de-dupe lines
  schemaInference.ts     TypeScript interface / JSON Schema inference from a JSON sample
  diff.ts                Line-level diff for the Diff tab
  formats/               Per-format parse/prettify/minify (json.ts, csv.ts, xml.ts, yaml.ts, text.ts)
```
