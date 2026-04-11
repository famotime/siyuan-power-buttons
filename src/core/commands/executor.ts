import type { PowerButtonItem } from "@/shared/types";
import type { ExternalCommandProvider } from "@/core/commands/external-command-types";
import { parseExternalCommandActionId } from "@/core/commands/external-command-types";

type PluginLike = {
  globalCommand?: (command: string) => unknown;
};

type CommandHandler = () => void | Promise<void>;
type Notify = (message: string, type?: "info" | "error") => void | Promise<void>;
type ExternalCommandRegistryLike = {
  refresh?: () => Promise<void>;
  getProvider: (providerId: string) => ExternalCommandProvider | null;
};

export class CommandExecutor {
  constructor(private readonly options: {
    plugin: PluginLike;
    notify?: Notify;
    pluginCommands: Map<string, CommandHandler>;
    externalCommands?: ExternalCommandRegistryLike;
    openUrl: (url: string) => void | Promise<void>;
    runBuiltinCommand?: (commandId: string) => boolean | Promise<boolean>;
    runExperimentalShortcut?: (item: Pick<PowerButtonItem, "actionType" | "actionId" | "experimentalShortcut">) => boolean | Promise<boolean>;
    runExperimentalClickSequence?: (item: Pick<PowerButtonItem, "actionType" | "actionId" | "experimentalClickSequence">) => boolean | Promise<boolean>;
    sourcePluginVersion?: string;
  }) {}

  async execute(
    item: Pick<PowerButtonItem, "id" | "surface" | "actionType" | "actionId" | "experimentalShortcut" | "experimentalClickSequence">,
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
      case "external-plugin-command": {
        const parsed = parseExternalCommandActionId(item.actionId);
        if (!parsed) {
          await this.options.notify?.(`外部命令配置无效：${item.actionId}`, "error");
          return;
        }

        let provider = this.options.externalCommands?.getProvider(parsed.providerId) || null;
        if (!provider) {
          try {
            await this.options.externalCommands?.refresh?.();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.options.notify?.(`读取外部插件命令失败：${message}`, "error");
            return;
          }
          provider = this.options.externalCommands?.getProvider(parsed.providerId) || null;
        }

        if (!provider) {
          await this.options.notify?.(`未检测到外部插件：${parsed.providerId}`, "error");
          return;
        }

        try {
          const result = await provider.invokeCommand(parsed.commandId, {
            trigger: "button-click",
            sourcePlugin: "siyuan-power-buttons",
            sourcePluginVersion: this.options.sourcePluginVersion,
            surface: item.surface,
            buttonId: item.id,
          });

          if (!result.ok && !result.alreadyNotified) {
            await this.options.notify?.(result.message || `外部命令执行失败：${parsed.commandId}`, "error");
            return;
          }

          if (result.ok && result.message && !result.alreadyNotified) {
            await this.options.notify?.(result.message, "info");
          }
          return;
        } catch {
          await this.options.notify?.(`外部命令执行失败：${parsed.commandId}`, "error");
          return;
        }
      }
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
