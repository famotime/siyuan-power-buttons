import type { PowerButtonItem } from "@/shared/types";

type PluginLike = {
  globalCommand?: (command: string) => unknown;
};

type CommandHandler = () => void | Promise<void>;
type Notify = (message: string, type?: "info" | "error") => void | Promise<void>;

export class CommandExecutor {
  constructor(private readonly options: {
    plugin: PluginLike;
    notify?: Notify;
    pluginCommands: Map<string, CommandHandler>;
    openUrl: (url: string) => void | Promise<void>;
    runBuiltinCommand?: (commandId: string) => boolean | Promise<boolean>;
    runExperimentalShortcut?: (item: Pick<PowerButtonItem, "actionType" | "actionId" | "experimentalShortcut">) => boolean | Promise<boolean>;
    runExperimentalClickSequence?: (item: Pick<PowerButtonItem, "actionType" | "actionId" | "experimentalClickSequence">) => boolean | Promise<boolean>;
  }) {}

  async execute(
    item: Pick<PowerButtonItem, "actionType" | "actionId" | "experimentalShortcut" | "experimentalClickSequence">,
  ): Promise<void> {
    switch (item.actionType) {
      case "builtin-global-command":
        if (typeof this.options.plugin.globalCommand === "function") {
          this.options.plugin.globalCommand(item.actionId);
          return;
        }
        if (await this.options.runBuiltinCommand?.(item.actionId)) {
          return;
        }
        await this.options.notify?.(`内置命令当前无法执行：${item.actionId}`, "error");
        return;
      case "plugin-command":
        await this.options.pluginCommands.get(item.actionId)?.();
        return;
      case "open-url":
        await this.options.openUrl(item.actionId);
        return;
      case "experimental-shortcut":
        if (await this.options.runExperimentalShortcut?.(item)) {
          return;
        }
        await this.options.notify?.(`实验快捷键当前无法执行：${item.actionId}`, "error");
        return;
      case "experimental-click-sequence":
        if (await this.options.runExperimentalClickSequence?.(item)) {
          return;
        }
        await this.options.notify?.(`实验点击序列当前无法执行：${item.actionId}`, "error");
        return;
      default:
        return;
    }
  }
}
