# Universal Data Formatter

[![CI](https://github.com/hardworkingmission/universal-data-formatter/actions/workflows/ci.yml/badge.svg)](https://github.com/hardworkingmission/universal-data-formatter/actions/workflows/ci.yml)

A client-side tool for converting, validating, and beautifying structured
data — JSON, CSV, XML, YAML, and plain text. Everything runs in the
browser; no input ever leaves the page.

## Highlights

- Format and validate five data formats in a side-by-side editor.
- Convert between JSON and CSV, XML, or YAML.
- Compare input and output with a line-level diff.
- Generate TypeScript types and JSON Schema from JSON samples.
- Upload files, copy or download results, and chain operations by swapping panes.
- Process data locally without an account, API key, or database.

Built with **Next.js App Router, React, TypeScript, Tailwind CSS, and CodeMirror 6**.

## Setup

Use Node.js **24.x** (also specified in `.nvmrc` and `package.json`).

```bash
git clone https://github.com/hardworkingmission/universal-data-formatter.git
cd universal-data-formatter
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run build && npm run start` produces a production build; `npm run lint` runs ESLint.

## Verification

```bash
npx playwright install chromium
npm run check
```

This runs ESLint, TypeScript, regression tests (including browser interactions),
and the production build. Tests cover XML content preservation, conversion errors,
schema generation, and switching output formats. To use an installed Chrome browser
instead, set `PLAYWRIGHT_CHANNEL=chrome` when running tests.

GitHub Actions runs the same checks on pushes to `main` and pull requests.

## Contributing

Issues and pull requests are welcome. For a bug report, include the input format,
action, expected result, and a small sample that reproduces the issue. Use synthetic
data instead of personal or confidential information.

Before opening a pull request, run `npm run check` and update regression coverage
when changing parsing or conversion behavior.

## Deploy to Vercel

1. Push this project, including `package-lock.json`, to your Git repository.
2. Import the repository in Vercel and choose **Next.js** as the framework.
3. Set the root directory to this project's directory (`./` for a standalone repository).
4. Use Node.js **24.x**, install command `npm ci`, and build command `npm run build`.
   Keep the output directory at the framework default.
5. Deploy and check formatting, conversion, copy/download, and the mobile layout
   on the preview URL before promoting it to production.

No environment variables, database, or API keys are required. Vercel's native
Next.js integration handles the deployment; a custom `vercel.json` is unnecessary.
All data processing remains in the browser. System fonts avoid network downloads
during the build.

See [Vercel build settings](https://vercel.com/docs/builds/configure-a-build) and
[supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

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

- **Conversion limits.** XML-to-JSON groups repeated elements into arrays and uses
  `@name` for attributes and `#text` for text. This mapping does not preserve the
  ordering of mixed XML content, so XML/JSON conversion is not a lossless round trip.
  CSV numbers are inferred only when their spelling and integer precision can be
  preserved; identifiers such as `001` remain strings. Cyclic YAML aliases cannot
  be represented as JSON and produce an inline error.

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
