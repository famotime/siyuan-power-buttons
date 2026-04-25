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
      id: "pb-378f4f34-6cca-47a2-99d9-a240a248e31a",
      title: "今日日记",
      iconType: "iconpark",
      iconValue: "iconpark:CalendarDot",
      surface: "statusbar-right",
      actionType: "builtin-global-command",
      actionId: "dailyNote",
      tooltip: "",
    }),
    createButtonItem({
      id: "pb-79368952-7aa4-4ee9-9caa-ecea414bad76",
      title: "最近文档",
      iconType: "iconpark",
      iconValue: "iconpark:DocSearchTwo",
      surface: "statusbar-right",
      actionType: "experimental-shortcut",
      actionId: "Ctrl+E",
      tooltip: "",
      experimentalShortcut: {
        shortcut: "Ctrl+E",
        sendEscapeBefore: false,
        dispatchTarget: "auto",
        allowDirectWindowDispatch: false,
      },
    }),
    createButtonItem({
      id: "pb-76916412-1ea9-4cc4-b8cf-a3773a7ba003",
      title: "数据历史",
      iconType: "iconpark",
      iconValue: "iconpark:History",
      surface: "statusbar-right",
      actionType: "experimental-shortcut",
      actionId: "Alt+H",
      tooltip: "",
      experimentalShortcut: {
        shortcut: "Alt+H",
        sendEscapeBefore: false,
        dispatchTarget: "auto",
        allowDirectWindowDispatch: false,
      },
    }),
    createButtonItem({
      id: "pb-88b89a52-3e8f-4f15-8cf9-99def14d42c7",
      title: "集市",
      iconType: "iconpark",
      iconValue: "iconpark:WeixinMarket",
      surface: "statusbar-right",
      actionType: "experimental-click-sequence",
      actionId: "barWorkspace",
      tooltip: "",
      experimentalClickSequence: {
        steps: [
          {
            selector: "barWorkspace",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 2,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "config",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 2,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "bazaar",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 2,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
        ],
        stopOnFailure: true,
      },
    }),
    createButtonItem({
      id: "pb-ac74263a-43a7-438a-93fa-0e97a8a97859",
      title: "重启所有插件",
      iconType: "iconpark",
      iconValue: "iconpark:FigmaResetInstance",
      surface: "statusbar-right",
      actionType: "builtin-global-command",
      actionId: "restartPlugins",
      tooltip: "",
    }),
    createButtonItem({
      id: "pb-72370934-8420-4c2b-abfa-928764ca6d84",
      title: "切换到英文",
      iconType: "iconpark",
      iconValue: "iconpark:English",
      surface: "statusbar-right",
      actionType: "experimental-click-sequence",
      actionId: "barWorkspace",
      tooltip: "",
      experimentalClickSequence: {
        steps: [
          {
            selector: "barWorkspace",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "config",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "appearance",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "lang",
            value: "English (en_US)",
            valueMode: "text",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
        ],
        stopOnFailure: true,
      },
    }),
    createButtonItem({
      id: "pb-d367924d-a9ac-4eae-91ec-69dcd19eaffd",
      title: "切换到中文",
      iconType: "iconpark",
      iconValue: "iconpark:Chinese",
      surface: "statusbar-right",
      actionType: "experimental-click-sequence",
      actionId: "barWorkspace",
      tooltip: "",
      experimentalClickSequence: {
        steps: [
          {
            selector: "barWorkspace",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "config",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "appearance",
            valueMode: "value",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
          {
            selector: "lang",
            value: "简体中文 (zh_CN)",
            valueMode: "text",
            timeoutMs: 5000,
            retryCount: 1,
            retryDelayMs: 300,
            delayAfterMs: 200,
          },
        ],
        stopOnFailure: true,
      },
    }),
    createButtonItem({
      id: "pb-4f7c5741-8099-4f3a-b5b3-7921f1f74355",
      title: "仅导出当前文档",
      iconType: "iconpark",
      iconValue: "iconpark:FileText",
      surface: "canvas",
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:export-current",
      tooltip: "",
    }),
    createButtonItem({
      id: "pb-4b654804-355d-4a3d-960f-8437e0f36e9b",
      title: "随心按设置",
      iconType: "iconpark",
      iconValue: "iconpark:AsteriskKey",
      surface: "statusbar-right",
      actionType: "plugin-command",
      actionId: "siyuan-power-buttons:open-settings",
      tooltip: "",
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
