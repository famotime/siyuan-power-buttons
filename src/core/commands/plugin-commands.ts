import type { PluginCommandDefinition } from "@/shared/types";
import {
  INTERNAL_PLUGIN_PROVIDER_ID,
  INTERNAL_PLUGIN_PROVIDER_NAME,
} from "@/shared/constants";
import { formatExternalCommandActionId } from "@/core/commands/external-command-types";

export const PLUGIN_COMMANDS: PluginCommandDefinition[] = [
  {
    id: "open-settings",
    title: "随心按",
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

export function formatInternalPluginCommandActionId(commandId: string): string {
  return formatExternalCommandActionId(INTERNAL_PLUGIN_PROVIDER_ID, commandId);
}

export function formatPluginCommandMenuTitle(commandTitle: string, pluginName = INTERNAL_PLUGIN_PROVIDER_NAME): string {
  return `动作类型（插件命令）-${pluginName}-${commandTitle}`;
}
