import {
  Dialog,
  Plugin,
  fetchSyncPost,
  getFrontend,
  showMessage,
} from "siyuan";
import pluginInfo from "@/../plugin.json";
import {
  ConfigStore,
  exportConfigAsJson,
} from "@/core/config";
import {
  getExperimentalFeatureSupport,
  type ExperimentalFeatureKey,
} from "@/core/compatibility/version-guard";
import {
  BUILTIN_COMMANDS,
  CommandExecutor,
  ExternalCommandRegistry,
  executeExperimentalClickSequence,
  executeExperimentalShortcut,
  executeBuiltinCommandByDom,
  PLUGIN_COMMANDS,
} from "@/core/commands";
import { PowerButtonsRuntime } from "@/core/runtime/plugin-runtime";
import { SettingsDialogController } from "@/core/runtime/settings-dialog-controller";
import { getAppVersion } from "@/core/system/app-version";
import { SurfaceManager } from "@/core/surfaces";
import { mountSettingsApp } from "@/main";
import { readNativeSurfaceSnapshot } from "@/shared/runtime-snapshot";

export default class SiyuanPowerButtonsPlugin extends Plugin {
  private configStore = new ConfigStore(this);
  private appVersion: string | null = null;
  private readonly pluginCommandHandlers = new Map<string, () => void | Promise<void>>();
  private readonly externalCommands = new ExternalCommandRegistry({
    getPlugins: () => this.app?.plugins as Array<{ name?: string; getPowerButtonsIntegration?: () => unknown }> | undefined,
  });
  private executor = new CommandExecutor({
    plugin: this as Plugin & { globalCommand?: (command: string) => void },
    notify: (message, type = "info") => {
      showMessage(message, 5000, type);
    },
    pluginCommands: this.pluginCommandHandlers,
    openUrl: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    runBuiltinCommand: commandId => executeBuiltinCommandByDom(commandId, document),
    runExperimentalShortcut: item => {
      const support = this.getExperimentalSupport("shortcutAdapter");
      if (!support.supported) {
        showMessage(support.reason || "实验快捷键适配当前不可用。", 5000, "error");
        return true;
      }
      return executeExperimentalShortcut(item, {
        getKeymap: () => (window as typeof window & { siyuan?: { config?: { keymap?: unknown } } }).siyuan?.config?.keymap as never,
        executeBuiltinCommand: commandId => {
          const pluginWithGlobal = this as Plugin & { globalCommand?: (command: string) => void };
          if (typeof pluginWithGlobal.globalCommand === "function") {
            pluginWithGlobal.globalCommand(commandId);
            return true;
          }
          return executeBuiltinCommandByDom(commandId, document);
        },
        executePluginCommand: async commandId => {
          const handler = this.pluginCommandHandlers.get(commandId);
          if (!handler) {
            return false;
          }
          await handler();
          return true;
        },
      });
    },
    runExperimentalClickSequence: item => {
      const support = this.getExperimentalSupport("clickSequenceAdapter");
      if (!support.supported) {
        showMessage(support.reason || "实验点击序列当前不可用。", 5000, "error");
        return true;
      }
      return executeExperimentalClickSequence(item, {
        document,
        root: document,
        windowTarget: window,
        onStepError: ({ index, selector }) => {
          showMessage(`点击序列第 ${index + 1} 步失败：${selector}`, 5000, "error");
        },
      });
    },
  });
  private runtime = new PowerButtonsRuntime({
    plugin: this,
    configStore: this.configStore,
    builtinCommands: BUILTIN_COMMANDS,
    pluginCommands: PLUGIN_COMMANDS,
    pluginCommandHandlers: this.pluginCommandHandlers,
    externalCommands: this.externalCommands,
    settingsDialog: new SettingsDialogController({
      createDialog: options => new Dialog(options),
      mountSettingsApp,
    }),
    createSurfaceManager: () => new SurfaceManager(this, this.executor),
    executor: this.executor,
    exportConfigAsJson,
    clipboard: navigator.clipboard,
    getFrontend,
    showMessage,
    readCurrentLayout: () => readNativeSurfaceSnapshot(document),
  });

  public readonly version = pluginInfo.version;

  async onload(): Promise<void> {
    try {
      this.appVersion = await getAppVersion((url, data) => fetchSyncPost(url, data));
    } catch {
      this.appVersion = null;
    }
    await this.runtime.onload();
  }

  onLayoutReady(): void {
    this.runtime.onLayoutReady();
  }

  openSetting(): void {
    this.runtime.openSetting();
  }

  onunload(): void {
    this.runtime.onunload();
  }

  private getExperimentalSupport(feature: ExperimentalFeatureKey): { supported: boolean; reason?: string } {
    return getExperimentalFeatureSupport({
      feature,
      enabled: this.configStore.getConfig().experimental[feature],
      frontend: getFrontend(),
      appVersion: this.appVersion,
      minAppVersion: pluginInfo.minAppVersion,
    });
  }
}
