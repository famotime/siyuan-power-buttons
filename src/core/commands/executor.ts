import type { PowerButtonItem } from "@/shared/types";

type PluginLike = {
  globalCommand?: (command: string) => unknown;
};

type CommandHandler = () => void | Promise<void>;

export class CommandExecutor {
  constructor(private readonly options: {
    plugin: PluginLike;
    pluginCommands: Map<string, CommandHandler>;
    openUrl: (url: string) => void | Promise<void>;
    openSetting: () => void | Promise<void>;
  }) {}

  async execute(item: Pick<PowerButtonItem, "actionType" | "actionId">): Promise<void> {
    switch (item.actionType) {
      case "builtin-global-command":
        this.options.plugin.globalCommand?.(item.actionId);
        return;
      case "plugin-command":
        await this.options.pluginCommands.get(item.actionId)?.();
        return;
      case "custom-action":
        if (item.actionId === "open-settings") {
          await this.options.openSetting();
        }
        return;
      case "open-url":
        await this.options.openUrl(item.actionId);
        return;
      default:
        return;
    }
  }
}
