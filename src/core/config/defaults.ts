import {
  DEFAULT_ICONPARK_ICON,
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
    iconType: (overrides.iconType || "iconpark") as IconType,
    iconValue: overrides.iconValue || DEFAULT_ICONPARK_ICON,
    surface: (overrides.surface || "statusbar-right") as SurfaceType,
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
      title: "最近文档",
      iconType: "iconpark",
      iconValue: "iconpark:HistoryQuery",
      surface: "topbar",
      actionType: "builtin-global-command",
      actionId: "recentDocs",
      tooltip: "打开最近文档",
    }),
    createButtonItem({
      title: "今日日记",
      iconType: "iconpark",
      iconValue: "iconpark:CalendarDot",
      surface: "statusbar-left",
      actionType: "builtin-global-command",
      actionId: "dailyNote",
      tooltip: "打开今日日记",
    }),
  ]);

  return {
    version: 2,
    desktopOnly: true,
    items,
    disabledNativeButtons: [],
    experimental: {
      nativeToolbarControl: false,
      internalCommandAdapter: false,
      shortcutAdapter: true,
      clickSequenceAdapter: true,
    },
  };
}
