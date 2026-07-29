import type { ActionId, DataFormat } from "./types";

export interface Preset {
  id: string;
  label: string;
  format: DataFormat;
  action: ActionId;
}
