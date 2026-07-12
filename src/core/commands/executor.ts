import type { PowerButtonItem } from "@/shared/types";
import type { ExternalCommandProvider } from "@/core/commands/external-command-types";
import { parseExternalCommandActionId } from "@/core/commands/external-command-types";
import { INTERNAL_PLUGIN_PROVIDER_ID } from "@/shared/constants";

type PluginLike = {
  globalCommand?: (command: string) => unknown;
};

type CommandHandler = () => void | Promise<void>;
type Notify = (message: string, type?: "info" | "error") => void | Promise<void>;
type ExternalCommandRegistryLike = {
  refresh?: () => Promise<void>;
  getProvider: (providerId: string) => ExternalCommandProvider | null;
};

function shouldFallbackToUndocumentedGlobalCommand(commandId: string): boolean {
  return commandId !== "dailyNote" && commandId !== "restartPlugins";
}

export class CommandExecutor {
  constructor(private readonly options: {
    plugin: PluginLike;
    notify?: Notify;
    t?: (key: string, replacements?: Record<string, string>) => string;
    pluginCommands: Map<string, CommandHandler>;
    externalCommands?: ExternalCommandRegistryLike;
    openUrl: (url: string) => void | Promise<void>;
    runBuiltinCommand?: (commandId: string) => boolean | Promise<boolean>;
    runExperimentalShortcut?: (item: Pick<PowerButtonItem, "actionType" | "actionId" | "experimentalShortcut">) => boolean | Promise<boolean>;
    runExperimentalClickSequence?: (item: Pick<PowerButtonItem, "actionType" | "actionId" | "experimentalClickSequence">) => boolean | Promise<boolean>;
    sourcePluginVersion?: string;
  }) {}

  private notify(message: string, type?: string): void {
    this.options.notify?.(message, type);
  }

  private t(key: string, replacements?: Record<string, string>): string {
    return this.options.t?.(key, replacements) ?? key;
  }

  async execute(
    item: Pick<PowerButtonItem, "id" | "surface" | "actionType" | "actionId" | "experimentalShortcut" | "experimentalClickSequence">,
  ): Promise<void> {
    switch (item.actionType) {
      case "builtin-global-command":
        if (await this.options.runBuiltinCommand?.(item.actionId)) {
          return;
        }
        if (
          typeof this.options.plugin.globalCommand === "function"
          && shouldFallbackToUndocumentedGlobalCommand(item.actionId)
        ) {
          this.options.plugin.globalCommand(item.actionId);
          return;
        }
        await this.notify(this.t("builtinCommandFailed", { commandId: item.actionId }), "error");
        return;
      case "plugin-command": {
        const parsed = parseExternalCommandActionId(item.actionId);
        if (!parsed) {
          await this.notify(this.t("pluginCommandInvalid", { actionId: item.actionId }), "error");
          return;
        }

        if (parsed.commandId === "__unset__") {
          await this.notify(this.t("pluginCommandInvalid", { actionId: item.actionId }), "error");
          return;
        }

        if (parsed.providerId === INTERNAL_PLUGIN_PROVIDER_ID) {
          await this.options.pluginCommands.get(parsed.commandId)?.();
          return;
        }

        let provider = this.options.externalCommands?.getProvider(parsed.providerId) || null;
        if (!provider) {
          try {
            await this.options.externalCommands?.refresh?.();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.notify(this.t("pluginCommandLoadFailed", { message }), "error");
            return;
          }
          provider = this.options.externalCommands?.getProvider(parsed.providerId) || null;
        }

        if (!provider) {
          await this.notify(this.t("pluginNotFound", { providerId: parsed.providerId }), "error");
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
            await this.notify(result.message || this.t("pluginCommandFailed", { commandId: parsed.commandId }), "error");
            return;
          }

          if (result.ok && result.message && !result.alreadyNotified) {
            await this.notify(result.message, "info");
          }
          return;
        } catch {
          await this.notify(this.t("pluginCommandFailed", { commandId: parsed.commandId }), "error");
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
        await this.notify(this.t("experimentalShortcutFailed", { actionId: item.actionId }), "error");
        return;
      case "experimental-click-sequence":
        if (await this.options.runExperimentalClickSequence?.(item)) {
          return;
        }
        await this.notify(this.t("experimentalClickSequenceFailed", { actionId: item.actionId }), "error");
        return;
      default:
        return;
    }
  }
}
