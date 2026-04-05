import type { PluginCommandDefinition } from "@/shared/types";

export const PLUGIN_COMMANDS: PluginCommandDefinition[] = [
  {
    id: "open-settings",
    title: "打开快捷按钮设置",
    description: "打开可视化配置界面。",
  },
  {
    id: "copy-config-json",
    title: "复制当前配置 JSON",
    description: "将当前配置复制到剪贴板。",
  },
  {
    id: "restore-defaults",
    title: "恢复默认按钮",
    description: "恢复到默认预设。",
  },
];
