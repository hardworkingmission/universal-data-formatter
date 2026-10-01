import type { ActionId, DataFormat } from "./types";

const CONVERT_TARGET: Partial<Record<ActionId, DataFormat>> = {
  convertToJson: "json",
  convertToCsv: "csv",
  convertToYaml: "yaml",
  convertToXml: "xml",
};

/** The format the output pane actually holds, which differs from the input
 * format only when the last action was a cross-format conversion. */
export function effectiveOutputFormat(inputFormat: DataFormat, lastAction: ActionId | null): DataFormat {
  if (lastAction === "validate") return "text";
  if (lastAction && CONVERT_TARGET[lastAction]) return CONVERT_TARGET[lastAction]!;
  return inputFormat;
}

const EXTENSIONS: Record<DataFormat, string> = {
  json: "json",
  csv: "csv",
  xml: "xml",
  yaml: "yaml",
  text: "txt",
};

export function fileExtension(format: DataFormat): string {
  return EXTENSIONS[format];
}
