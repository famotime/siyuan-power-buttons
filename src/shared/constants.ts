export const CONFIG_STORAGE_NAME = "settings.json";

export const DEFAULT_BUILTIN_ICON = "iconInfo";
export const DEFAULT_PLUGIN_COMMAND = "open-settings";

export const SURFACE_LABELS: Record<string, string> = {
  topbar: "顶栏",
  "statusbar-left": "状态栏左侧",
  "statusbar-right": "状态栏右侧",
  canvas: "编辑区",
  "dock-left-top": "左侧 Dock 上方",
  "dock-left-bottom": "左侧 Dock 下方",
  "dock-right-top": "右侧 Dock 上方",
  "dock-right-bottom": "右侧 Dock 下方",
  "dock-bottom-left": "底部 Dock 左侧",
  "dock-bottom-right": "底部 Dock 右侧",
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  "builtin-global-command": "内置命令",
  "plugin-command": "插件命令",
  "external-plugin-command": "外部插件命令",
  "open-url": "打开链接",
  "experimental-shortcut": "实验：快捷键适配",
  "experimental-click-sequence": "实验：点击序列",
};
