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
  return commandId !== "dailyNote" && commandId !== "restartPlugins" && commandId !== "switchAllDock";
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
    getPlugins?: () => unknown[] | undefined;
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

        if (parsed.providerId === "plugin-setting") {
          const plugins = (this.options.getPlugins?.() || []) as Array<{
            name?: string;
            displayName?: string;
            openSetting?: () => void;
            setting?: { open?: (name?: string) => void };
          }>;
          const targetPlugin = plugins.find(p => p?.name === parsed.commandId);
          if (!targetPlugin) {
            await this.notify(this.t("pluginNotInstalledOrDisabled", { providerId: parsed.commandId }), "error");
            return;
          }
          if (typeof targetPlugin.openSetting === "function") {
            targetPlugin.openSetting();
            return;
          }
          if (targetPlugin.setting && typeof targetPlugin.setting.open === "function") {
            targetPlugin.setting.open(targetPlugin.displayName || targetPlugin.name);
            return;
          }
          await this.notify(this.t("pluginNotInstalledOrDisabled", { providerId: parsed.commandId }), "error");
          return;
        }

        if (parsed.providerId === "plugin-topbar") {
          const [pluginName, ...rest] = parsed.commandId.split("__");
          const topbarId = rest.join("__");
          const plugins = (this.options.getPlugins?.() || []) as Array<{
            name?: string;
            topBarIcons?: Element[];
          }>;
          const targetPlugin = plugins.find(p => p?.name === pluginName);
          if (!targetPlugin) {
            await this.notify(this.t("pluginNotInstalledOrDisabled", { providerId: pluginName }), "error");
            return;
          }
          const topbars: Element[] = Array.isArray(targetPlugin.topBarIcons) ? targetPlugin.topBarIcons : [];
          const el = topbars.find((item, idx) =>
            item?.getAttribute?.("data-id") === topbarId ||
            item?.id === topbarId ||
            String(idx) === topbarId,
          ) || (typeof document !== "undefined" ? document.getElementById(topbarId) : null);

          if (el) {
            const htmlEl = el as HTMLElement;
            if (typeof htmlEl.onclick === "function") {
              htmlEl.onclick(new MouseEvent("click", { bubbles: true, cancelable: true }));
            } else {
              htmlEl.click?.();
              htmlEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            }
            return;
          }
          await this.notify(this.t("pluginNotInstalledOrDisabled", { providerId: pluginName }), "error");
          return;
        }

        if (parsed.providerId === "plugin-dock") {
          const [pluginName, ...rest] = parsed.commandId.split("__");
          const dockKey = rest.join("__");
          const plugins = (this.options.getPlugins?.() || []) as Array<{
            name?: string;
            docks?: Record<string, unknown>;
          }>;
          const targetPlugin = plugins.find(p => p?.name === pluginName);
          if (!targetPlugin) {
            await this.notify(this.t("pluginNotInstalledOrDisabled", { providerId: pluginName }), "error");
            return;
          }

          // 1. 优先尝试点击思源原生 DOM 中的侧栏按钮
          let el = typeof document !== "undefined"
            ? (document.querySelector(`.dock .dock__item[data-type="${dockKey}"]`) ||
               document.querySelector(`.dock__item[data-type="${dockKey}"]`))
            : null;

          if (!el && typeof document !== "undefined") {
            el = document.querySelector(`.dock .dock__item[data-type="${pluginName}${dockKey}"]`) ||
                 document.querySelector(`.dock__item[data-type="${pluginName}${dockKey}"]`);
          }

          if (el) {
            const htmlEl = el as HTMLElement;
            if (typeof htmlEl.onclick === "function") {
              htmlEl.onclick(new MouseEvent("click", { bubbles: true, cancelable: true }));
            } else {
              htmlEl.click?.();
              htmlEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            }
            return;
          }

          // 2. 尝试调用思源原生 Dock API toggleModel
          const siyuan = typeof window !== "undefined" ? (window as any).siyuan : null;
          const layoutDocks = [
            siyuan?.layout?.leftDock,
            siyuan?.layout?.rightDock,
            siyuan?.layout?.bottomDock,
          ].filter(Boolean);
          for (const dock of layoutDocks) {
            if (typeof dock.toggleModel === "function" && (dock.data?.[dockKey] || dock.data?.[`${pluginName}${dockKey}`])) {
              dock.toggleModel(dock.data?.[dockKey] ? dockKey : `${pluginName}${dockKey}`);
              return;
            }
          }

          await this.notify(this.t("pluginCommandFailed", { commandId: parsed.commandId }), "error");
          return;
        }

        if (parsed.providerId === "plugin-cmd") {
          const [pluginName, ...rest] = parsed.commandId.split("__");
          const cmdKey = rest.join("__");
          const plugins = (this.options.getPlugins?.() || []) as Array<{
            name?: string;
            commands?: Array<{ langKey?: string; callback?: () => void | Promise<void> }>;
          }>;
          const targetPlugin = plugins.find(p => p?.name === pluginName);
          if (!targetPlugin) {
            await this.notify(this.t("pluginNotInstalledOrDisabled", { providerId: pluginName }), "error");
            return;
          }
          const commands = Array.isArray(targetPlugin.commands) ? targetPlugin.commands : [];
          const cmd = commands.find((item, idx) =>
            item?.langKey === cmdKey ||
            String(idx) === cmdKey,
          );
          if (cmd && typeof cmd.callback === "function") {
            await cmd.callback();
            return;
          }
          await this.notify(this.t("pluginNotInstalledOrDisabled", { providerId: pluginName }), "error");
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
          if (parsed.providerId === "siyuan-doc-assist") {
            const customMessage = this.t("docAssistPluginNotFound");
            if (customMessage && customMessage !== "docAssistPluginNotFound") {
              await this.notify(customMessage, "error");
              return;
            }
          }
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
