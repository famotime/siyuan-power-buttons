import { cloneConfig, normalizeItemOrder } from "@/shared/utils";
import type { PowerButtonItem, PowerButtonsConfig } from "@/shared/types";
import { sanitizeConfig } from "@/core/config/sanitize";

export interface ImportedButtonMergeStats {
  importedCount: number;
  skippedCount: number;
}

function buildButtonActionKey(item: Pick<PowerButtonItem, "actionType" | "actionId">): string {
  return `${item.actionType}::${item.actionId}`;
}

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

export function mergeImportedButtonsWithStats(
  currentConfig: PowerButtonsConfig,
  importedConfig: PowerButtonsConfig,
): ImportedButtonMergeStats & { config: PowerButtonsConfig } {
  const mergedConfig = cloneConfig(currentConfig);
  const importedItems = cloneConfig(importedConfig).items;
  const existingActionKeys = new Set(mergedConfig.items.map(buildButtonActionKey));
  const appendedItems: PowerButtonItem[] = [];
  let skippedCount = 0;

  for (const item of importedItems) {
    const actionKey = buildButtonActionKey(item);
    if (existingActionKeys.has(actionKey)) {
      skippedCount += 1;
      continue;
    }

    existingActionKeys.add(actionKey);
    appendedItems.push(item);
  }

  mergedConfig.items = normalizeItemOrder([...mergedConfig.items, ...appendedItems]);

  return {
    config: mergedConfig,
    importedCount: appendedItems.length,
    skippedCount,
  };
}

export function mergeImportedButtons(
  currentConfig: PowerButtonsConfig,
  importedConfig: PowerButtonsConfig,
): PowerButtonsConfig {
  return mergeImportedButtonsWithStats(currentConfig, importedConfig).config;
}
