import {
  DEFAULT_BUILTIN_ICON,
} from "@/shared/constants";
import {
  createExperimentalClickSequenceConfig,
  createExperimentalShortcutConfig,
  getDefaultActionId,
} from "@/core/config/item-defaults";
import {
  createId,
  normalizeItemOrder,
} from "@/shared/utils";
import type {
  ActionType,
  IconType,
  PowerButtonItem,
  PowerButtonsConfig,
  SurfaceType,
} from "@/shared/types";

export function createButtonItem(overrides: Partial<PowerButtonItem> = {}): PowerButtonItem {
  const actionType = (overrides.actionType || "builtin-global-command") as ActionType;
  const actionId = overrides.actionId ?? getDefaultActionId(actionType);

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
        shortcut: overrides.experimentalShortcut?.shortcut ?? actionId,
        sendEscapeBefore: overrides.experimentalShortcut?.sendEscapeBefore,
        dispatchTarget: overrides.experimentalShortcut?.dispatchTarget,
        allowDirectWindowDispatch: overrides.experimentalShortcut?.allowDirectWindowDispatch,
      }, actionId)
      : overrides.experimentalShortcut,
    experimentalClickSequence: actionType === "experimental-click-sequence"
      ? createExperimentalClickSequenceConfig(overrides.experimentalClickSequence, actionId)
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
