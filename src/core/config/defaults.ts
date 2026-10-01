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
import { normalizeSurface } from "@/shared/surface-metadata";
import {
  CONFIGURABLE_SURFACES,
} from "@/shared/types";
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
  const surface = normalizeSurface((overrides.surface || "dock-panel") as SurfaceType);
  const surfaces = overrides.surfaces && overrides.surfaces.length > 0
    ? Array.from(new Set(overrides.surfaces.map(normalizeSurface)))
    : [surface];

  return {
    id: overrides.id || createId(),
    title: overrides.title || "新建",
    visible: overrides.visible ?? true,
    iconType: (overrides.iconType || "iconpark") as IconType,
    iconValue: overrides.iconValue || DEFAULT_ICONPARK_ICON,
    surface,
    surfaces,
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
    // 1. 文档与视图类
    createButtonItem({
      id: "pb-378f4f34-6cca-47a2-99d9-a240a248e31a",
      title: "今日日记",
      iconType: "iconpark",
      iconValue: "iconpark:CalendarDot",
      surface: "statusbar-right",
      surfaces: ["statusbar-right", "dock-panel"],
      actionType: "builtin-global-command",
      actionId: "dailyNote",
      tooltip: "",
    }),
    createButtonItem({
      id: "pb-b2c3d4e5-6789-4012-bcde-f0123456789a",
      title: "全部面板浮动切换",
      iconType: "iconpark",
      iconValue: "iconpark:ExpandLeftAndRight",
      surface: "statusbar-right",
      surfaces: ["statusbar-right", "dock-panel"],
      actionType: "builtin-global-command",
      actionId: "switchAllDock",
      tooltip: "",
    }),
    createButtonItem({
      id: "pb-b695ca42-26cb-4028-98e3-5121b6d0e625",
      title: "在浏览器打开",
      iconType: "iconpark",
      iconValue: "iconpark:Browser",
      surface: "statusbar-right",
      surfaces: ["statusbar-right", "dock-panel"],
      actionType: "plugin-command",
      actionId: "siyuan-power-buttons:open-in-browser",
      tooltip: "",
    }),

    // 2. 实用工具类
    createButtonItem({
      id: "pb-76916412-1ea9-4cc4-b8cf-a3773a7ba003",
      title: "数据历史",
      iconType: "iconpark",
      iconValue: "iconpark:History",
      surface: "dock-panel",
      surfaces: ["dock-panel"],
      actionType: "builtin-global-command",
      actionId: "dataHistory",
      tooltip: "",
    }),
    createButtonItem({
      id: "pb-88b89a52-3e8f-4f15-8cf9-99def14d42c7",
      title: "集市",
      iconType: "iconpark",
      iconValue: "iconpark:WeixinMarket",
      surface: "dock-panel",
      surfaces: ["dock-panel"],
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
      surfaces: ["statusbar-right", "dock-panel"],
      actionType: "builtin-global-command",
      actionId: "restartPlugins",
      tooltip: "",
    }),

    // 3. 插件命令类（思源文档助手联动示例）
    createButtonItem({
      id: "pb-d4e5f6a7-8901-4234-def0-123456789abc",
      title: "删除之前段落",
      iconType: "iconpark",
      iconValue: "iconpark:ToTop",
      surface: "dock-panel",
      surfaces: ["dock-panel"],
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:delete-from-start-to-current",
      tooltip: "从文档开头到当前光标所在段，批量删除所有同级正文块",
    }),
    createButtonItem({
      id: "pb-e5f6a7b8-9012-4345-ef01-23456789abcd",
      title: "删除后续段落",
      iconType: "iconpark",
      iconValue: "iconpark:ToBottom",
      surface: "dock-panel",
      surfaces: ["dock-panel"],
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:delete-from-current-to-end",
      tooltip: "从当前光标所在段开始，批量删除后续所有同级正文块",
    }),
    createButtonItem({
      id: "pb-f6a7b8c9-0123-4456-f012-3456789abcde",
      title: "批量转换为WebP",
      iconType: "iconpark",
      iconValue: "iconpark:Pic",
      surface: "dock-panel",
      surfaces: ["dock-panel"],
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:convert-images-to-webp",
      tooltip: "将当前文档里的本地图片批量转为 WebP 并回写链接",
    }),

    // 4. 偏好与设置类
    createButtonItem({
      id: "pb-d367924d-a9ac-4eae-91ec-69dcd19eaffd",
      title: "切换到中文",
      iconType: "iconpark",
      iconValue: "iconpark:Chinese",
      surface: "dock-panel",
      surfaces: ["dock-panel"],
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
      id: "pb-72370934-8420-4c2b-abfa-928764ca6d84",
      title: "切换到英文",
      iconType: "iconpark",
      iconValue: "iconpark:English",
      surface: "dock-panel",
      surfaces: ["dock-panel"],
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
      id: "pb-4b654804-355d-4a3d-960f-8437e0f36e9b",
      title: "随心按设置",
      iconType: "iconpark",
      iconValue: "iconpark:AsteriskKey",
      surface: "statusbar-right",
      surfaces: ["statusbar-right", "dock-panel"],
      actionType: "plugin-command",
      actionId: "siyuan-power-buttons:open-settings",
      tooltip: "",
    }),

    // 5. 画布工具
    createButtonItem({
      id: "pb-4f7c5741-8099-4f3a-b5b3-7921f1f74355",
      title: "仅导出当前文档",
      iconType: "iconpark",
      iconValue: "iconpark:FileText",
      surface: "canvas",
      surfaces: ["canvas"],
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:export-current",
      tooltip: "",
    }),
  ]);

  return {
    version: 2,
    desktopOnly: true,
    items,
    disabledNativeButtons: [],
    disabledSelectionToolbarItems: [],
    selectionToolbarLayout: [],
    surfaceLayouts: {
      "dock-panel": [
        { type: "divider", id: "divider-dock-docs", title: "文档与视图" },
        { type: "button", id: "pb-378f4f34-6cca-47a2-99d9-a240a248e31a" },
        { type: "button", id: "pb-b2c3d4e5-6789-4012-bcde-f0123456789a" },
        { type: "button", id: "pb-b695ca42-26cb-4028-98e3-5121b6d0e625" },

        { type: "divider", id: "divider-dock-tools", title: "实用工具" },
        { type: "button", id: "pb-76916412-1ea9-4cc4-b8cf-a3773a7ba003" },
        { type: "button", id: "pb-88b89a52-3e8f-4f15-8cf9-99def14d42c7" },
        { type: "button", id: "pb-ac74263a-43a7-438a-93fa-0e97a8a97859" },

        { type: "divider", id: "divider-dock-plugins", title: "插件命令" },
        { type: "button", id: "pb-d4e5f6a7-8901-4234-def0-123456789abc" },
        { type: "button", id: "pb-e5f6a7b8-9012-4345-ef01-23456789abcd" },
        { type: "button", id: "pb-f6a7b8c9-0123-4456-f012-3456789abcde" },

        { type: "divider", id: "divider-dock-prefs", title: "偏好与设置" },
        { type: "button", id: "pb-d367924d-a9ac-4eae-91ec-69dcd19eaffd" },
        { type: "button", id: "pb-72370934-8420-4c2b-abfa-928764ca6d84" },
        { type: "button", id: "pb-4b654804-355d-4a3d-960f-8437e0f36e9b" },
      ],
      "statusbar-right": [
        { type: "button", id: "pb-378f4f34-6cca-47a2-99d9-a240a248e31a" },
        { type: "button", id: "pb-b2c3d4e5-6789-4012-bcde-f0123456789a" },
        { type: "button", id: "pb-b695ca42-26cb-4028-98e3-5121b6d0e625" },
        { type: "button", id: "pb-ac74263a-43a7-438a-93fa-0e97a8a97859" },
        { type: "button", id: "pb-4b654804-355d-4a3d-960f-8437e0f36e9b" },
      ],
      canvas: [
        { type: "button", id: "pb-4f7c5741-8099-4f3a-b5b3-7921f1f74355" },
      ],
      topbar: [],
      "selection-toolbar": [],
    },
    experimental: {
      nativeToolbarControl: false,
      internalCommandAdapter: false,
      shortcutAdapter: true,
      clickSequenceAdapter: true,
    },
  };
}
