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
  IconType,
  PowerButtonItem,
  PowerButtonsConfig,
  SurfaceType,
} from "@/shared/types";

export function createButtonItem(overrides: Partial<PowerButtonItem> = {}): PowerButtonItem {
  return {
    id: overrides.id || createId(),
    title: overrides.title || "New Button",
    visible: overrides.visible ?? true,
    iconType: (overrides.iconType || "builtin") as IconType,
    iconValue: overrides.iconValue || DEFAULT_BUILTIN_ICON,
    surface: (overrides.surface || "topbar") as SurfaceType,
    order: overrides.order ?? 0,
    actionType: (overrides.actionType || "builtin-global-command") as ActionType,
    actionId: overrides.actionId || "globalSearch",
    tooltip: overrides.tooltip || "",
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
      surface: "dock-left-top",
      actionType: "builtin-global-command",
      actionId: "outline",
      tooltip: "显示大纲",
    }),
  ]);

  return {
    version: 1,
    desktopOnly: true,
    items,
    experimental: {
      nativeToolbarControl: false,
      internalCommandAdapter: false,
    },
  };
}
