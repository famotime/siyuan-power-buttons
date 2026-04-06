import {
  DEFAULT_BUILTIN_ICON,
  DEFAULT_CUSTOM_ACTION,
} from "@/shared/constants";
import {
  createId,
  normalizeItemOrder,
} from "@/shared/utils";
import type {
  ActionType,
  ClickSequenceStep,
  ExperimentalClickSequenceConfig,
  ExperimentalShortcutConfig,
  IconType,
  PowerButtonItem,
  PowerButtonsConfig,
  SurfaceType,
} from "@/shared/types";

function createExperimentalShortcutConfig(overrides: Partial<ExperimentalShortcutConfig> = {}): ExperimentalShortcutConfig {
  return {
    shortcut: overrides.shortcut || "Ctrl+B",
    sendEscapeBefore: overrides.sendEscapeBefore ?? false,
    dispatchTarget: overrides.dispatchTarget || "auto",
    allowDirectWindowDispatch: overrides.allowDirectWindowDispatch ?? false,
  };
}

function createClickSequenceStep(overrides: Partial<ClickSequenceStep> = {}): ClickSequenceStep {
  return {
    selector: overrides.selector || "text:设置",
    timeoutMs: overrides.timeoutMs ?? 5000,
    retryCount: overrides.retryCount ?? 2,
    retryDelayMs: overrides.retryDelayMs ?? 300,
    delayAfterMs: overrides.delayAfterMs ?? 200,
  };
}

function createExperimentalClickSequenceConfig(overrides: Partial<ExperimentalClickSequenceConfig> = {}): ExperimentalClickSequenceConfig {
  return {
    steps: overrides.steps?.length
      ? overrides.steps.map(step => createClickSequenceStep(step))
      : [createClickSequenceStep()],
    stopOnFailure: overrides.stopOnFailure ?? true,
  };
}

export function createButtonItem(overrides: Partial<PowerButtonItem> = {}): PowerButtonItem {
  const actionType = (overrides.actionType || "builtin-global-command") as ActionType;
  const actionId = overrides.actionId
    || (actionType === "experimental-shortcut"
      ? "Ctrl+B"
      : actionType === "experimental-click-sequence"
        ? "text:设置"
        : "globalSearch");

  return {
    id: overrides.id || createId(),
    title: overrides.title || "新建",
    visible: overrides.visible ?? true,
    iconType: (overrides.iconType || "builtin") as IconType,
    iconValue: overrides.iconValue || DEFAULT_BUILTIN_ICON,
    surface: (overrides.surface || "topbar") as SurfaceType,
    order: overrides.order ?? 0,
    actionType,
    actionId,
    tooltip: overrides.tooltip || "",
    experimentalShortcut: actionType === "experimental-shortcut"
      ? createExperimentalShortcutConfig({
        shortcut: overrides.experimentalShortcut?.shortcut || actionId,
        sendEscapeBefore: overrides.experimentalShortcut?.sendEscapeBefore,
        dispatchTarget: overrides.experimentalShortcut?.dispatchTarget,
        allowDirectWindowDispatch: overrides.experimentalShortcut?.allowDirectWindowDispatch,
      })
      : overrides.experimentalShortcut,
    experimentalClickSequence: actionType === "experimental-click-sequence"
      ? createExperimentalClickSequenceConfig(overrides.experimentalClickSequence)
      : overrides.experimentalClickSequence,
  };
}

export function createDefaultConfig(): PowerButtonsConfig {
  const items = normalizeItemOrder([
    createButtonItem({
      title: "全局搜索",
      iconValue: "iconSearch",
      surface: "topbar",
      actionType: "builtin-global-command",
      actionId: "globalSearch",
      tooltip: "打开全局搜索",
    }),
    createButtonItem({
      title: "插件设置",
      iconValue: "iconSettings",
      surface: "statusbar-right",
      actionType: "custom-action",
      actionId: DEFAULT_CUSTOM_ACTION,
      tooltip: "打开快捷按钮设置",
    }),
    createButtonItem({
      title: "大纲",
      iconValue: "iconList",
      surface: "statusbar-left",
      actionType: "builtin-global-command",
      actionId: "outline",
      tooltip: "显示大纲",
    }),
  ]);

  return {
    version: 2,
    desktopOnly: true,
    items,
    experimental: {
      nativeToolbarControl: false,
      internalCommandAdapter: false,
      shortcutAdapter: true,
      clickSequenceAdapter: true,
    },
  };
}
