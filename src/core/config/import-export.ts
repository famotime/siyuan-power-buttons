import { sanitizeConfig } from "@/core/config/sanitize";
import type { PowerButtonsConfig } from "@/shared/types";

export function exportConfigAsJson(config: PowerButtonsConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

export function importConfigFromJson(serialized: string): PowerButtonsConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new Error(`JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return sanitizeConfig(parsed);
}
