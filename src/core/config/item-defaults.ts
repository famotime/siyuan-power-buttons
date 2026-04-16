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

export function sanitizeExperimentalShortcutConfig(
  input: Partial<ExperimentalShortcutConfig> = {},
  actionId = "",
): ExperimentalShortcutConfig {
  return createExperimentalShortcutConfig({
    shortcut: typeof input.shortcut === "string" && input.shortcut.trim()
      ? input.shortcut.trim()
      : undefined,
    sendEscapeBefore: typeof input.sendEscapeBefore === "boolean" ? input.sendEscapeBefore : undefined,
    dispatchTarget: ["auto", "active-editor", "window", "body"].includes(String(input.dispatchTarget))
      ? input.dispatchTarget as ExperimentalShortcutConfig["dispatchTarget"]
      : undefined,
    allowDirectWindowDispatch: typeof input.allowDirectWindowDispatch === "boolean"
      ? input.allowDirectWindowDispatch
      : undefined,
  }, actionId);
}

export function createClickSequenceStep(
  overrides: Partial<ClickSequenceStep> = {},
  fallbackSelector = DEFAULT_CLICK_SEQUENCE_SELECTOR,
): ClickSequenceStep {
  const normalizedValue = typeof overrides.value === "string" && overrides.value.length > 0
    ? overrides.value
    : undefined;

  return {
    selector: overrides.selector || fallbackSelector,
    value: normalizedValue,
    valueMode: overrides.valueMode === "text" ? "text" : "value",
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

export function sanitizeExperimentalClickSequenceConfig(
  input: Partial<ExperimentalClickSequenceConfig> = {},
  actionId = DEFAULT_CLICK_SEQUENCE_SELECTOR,
): ExperimentalClickSequenceConfig {
  const fallbackSelector = getClickSequenceFallbackSelector(actionId);

  return createExperimentalClickSequenceConfig({
    steps: Array.isArray(input.steps)
      ? input.steps.map(step => createClickSequenceStep({
        selector: typeof step?.selector === "string" && step.selector.trim()
          ? step.selector.trim()
          : undefined,
        value: typeof step?.value === "string" ? step.value : undefined,
        valueMode: step?.valueMode === "text" ? "text" : step?.valueMode === "value" ? "value" : undefined,
        timeoutMs: Number.isFinite(step?.timeoutMs) && Number(step.timeoutMs) >= 0 ? Number(step.timeoutMs) : undefined,
        retryCount: Number.isFinite(step?.retryCount) && Number(step.retryCount) >= 0 ? Number(step.retryCount) : undefined,
        retryDelayMs: Number.isFinite(step?.retryDelayMs) && Number(step.retryDelayMs) >= 0 ? Number(step.retryDelayMs) : undefined,
        delayAfterMs: Number.isFinite(step?.delayAfterMs) && Number(step.delayAfterMs) >= 0 ? Number(step.delayAfterMs) : undefined,
      }, fallbackSelector))
      : undefined,
    stopOnFailure: typeof input.stopOnFailure === "boolean" ? input.stopOnFailure : undefined,
  }, actionId);
}
