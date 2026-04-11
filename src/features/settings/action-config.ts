import { formatExternalCommandActionId } from "@/core/commands";
import {
  createClickSequenceStep,
  createExperimentalClickSequenceConfig,
  createExperimentalShortcutConfig,
  getDefaultActionId,
} from "@/core/config/item-defaults";
import { DEFAULT_BUILTIN_ICON } from "@/shared/constants";
import type {
  BuiltinCommandDefinition,
  ExperimentalClickSequenceConfig,
  PluginCommandDefinition,
  PowerButtonItem,
} from "@/shared/types";
import { INTERNAL_PLUGIN_PROVIDER_ID } from "@/shared/constants";
import type { SettingsExternalCommandProvider } from "@/features/settings/types";

export function ensureExperimentalShortcutConfig(item: PowerButtonItem) {
  if (!item.experimentalShortcut) {
    item.experimentalShortcut = createExperimentalShortcutConfig();
  }
  return item.experimentalShortcut;
}

export const createDefaultClickSequenceStep = createClickSequenceStep;

export function ensureExperimentalClickSequenceConfig(item: PowerButtonItem): ExperimentalClickSequenceConfig {
  if (!item.experimentalClickSequence) {
    item.experimentalClickSequence = createExperimentalClickSequenceConfig({}, item.actionId);
  } else if (!item.experimentalClickSequence.steps.length) {
    item.experimentalClickSequence = createExperimentalClickSequenceConfig(item.experimentalClickSequence, item.actionId);
  } else {
    item.experimentalClickSequence = createExperimentalClickSequenceConfig(item.experimentalClickSequence, item.actionId);
  }
  return item.experimentalClickSequence;
}

export function ensureSelectedActionConfiguration(item: PowerButtonItem): void {
  if (item.actionType === "experimental-shortcut") {
    ensureExperimentalShortcutConfig(item);
    return;
  }

  if (item.actionType === "experimental-click-sequence") {
    ensureExperimentalClickSequenceConfig(item);
  }
}

export function summarizeClickSequence(sequence: ExperimentalClickSequenceConfig): string {
  return sequence.steps[0]?.selector || "text:设置";
}

export function applyActionTypeDefaults(
  item: PowerButtonItem,
  builtinCommands: BuiltinCommandDefinition[],
  pluginCommands: PluginCommandDefinition[],
  externalCommandProviders: SettingsExternalCommandProvider[] = [],
): void {
  if (item.actionType === "builtin-global-command") {
    item.actionId = builtinCommands[0]?.id || getDefaultActionId("builtin-global-command");
    return;
  }

  if (item.actionType === "plugin-command") {
    if (pluginCommands[0]) {
      item.actionId = formatExternalCommandActionId(INTERNAL_PLUGIN_PROVIDER_ID, pluginCommands[0].id);
      return;
    }

    const provider = externalCommandProviders[0];
    const command = provider?.commands[0];
    item.actionId = provider && command
      ? formatExternalCommandActionId(provider.providerId, command.id)
      : getDefaultActionId("plugin-command");
    return;
  }

  if (item.actionType === "experimental-shortcut") {
    item.actionId = ensureExperimentalShortcutConfig(item).shortcut.trim();
    return;
  }

  if (item.actionType === "experimental-click-sequence") {
    item.actionId = summarizeClickSequence(ensureExperimentalClickSequenceConfig(item));
  }
}

export function applyIconTypeDefaults(item: PowerButtonItem): void {
  if (item.iconType === "builtin") {
    item.iconValue = DEFAULT_BUILTIN_ICON;
    return;
  }

  if (item.iconType === "emoji") {
    item.iconValue = "⚡";
    return;
  }

  item.iconValue = `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`;
}
