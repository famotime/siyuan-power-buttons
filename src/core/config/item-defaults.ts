import { DEFAULT_PLUGIN_COMMAND } from "@/shared/constants";
import type {
  ActionType,
  ClickSequenceStep,
  ExperimentalClickSequenceConfig,
  ExperimentalShortcutConfig,
} from "@/shared/types";

export const DEFAULT_CLICK_SEQUENCE_SELECTOR = "text:设置";

export function getDefaultActionId(actionType: ActionType): string {
  if (actionType === "experimental-shortcut") {
    return "";
  }
  if (actionType === "plugin-command") {
    return DEFAULT_PLUGIN_COMMAND;
  }
  if (actionType === "experimental-click-sequence") {
    return DEFAULT_CLICK_SEQUENCE_SELECTOR;
  }
  return "globalSearch";
}

export function getClickSequenceFallbackSelector(actionId: string): string {
  return actionId && actionId !== "globalSearch" ? actionId : DEFAULT_CLICK_SEQUENCE_SELECTOR;
}

export function createExperimentalShortcutConfig(
  overrides: Partial<ExperimentalShortcutConfig> = {},
  fallbackShortcut = "",
): ExperimentalShortcutConfig {
  return {
    shortcut: overrides.shortcut ?? fallbackShortcut,
    sendEscapeBefore: overrides.sendEscapeBefore ?? false,
    dispatchTarget: overrides.dispatchTarget || "auto",
    allowDirectWindowDispatch: overrides.allowDirectWindowDispatch ?? false,
  };
}

export function createClickSequenceStep(
  overrides: Partial<ClickSequenceStep> = {},
  fallbackSelector = DEFAULT_CLICK_SEQUENCE_SELECTOR,
): ClickSequenceStep {
  return {
    selector: overrides.selector || fallbackSelector,
    timeoutMs: Number.isFinite(overrides.timeoutMs) && Number(overrides.timeoutMs) >= 0 ? Number(overrides.timeoutMs) : 5000,
    retryCount: Number.isFinite(overrides.retryCount) && Number(overrides.retryCount) >= 0 ? Number(overrides.retryCount) : 2,
    retryDelayMs: Number.isFinite(overrides.retryDelayMs) && Number(overrides.retryDelayMs) >= 0 ? Number(overrides.retryDelayMs) : 300,
    delayAfterMs: Number.isFinite(overrides.delayAfterMs) && Number(overrides.delayAfterMs) >= 0 ? Number(overrides.delayAfterMs) : 200,
  };
}

export function createExperimentalClickSequenceConfig(
  overrides: Partial<ExperimentalClickSequenceConfig> = {},
  actionId = DEFAULT_CLICK_SEQUENCE_SELECTOR,
): ExperimentalClickSequenceConfig {
  const fallbackSelector = getClickSequenceFallbackSelector(actionId);

  return {
    steps: overrides.steps?.length
      ? overrides.steps.map(step => createClickSequenceStep(step, fallbackSelector))
      : [createClickSequenceStep(undefined, fallbackSelector)],
    stopOnFailure: overrides.stopOnFailure ?? true,
  };
}
