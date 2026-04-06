import {
  Dialog,
  Plugin,
  getFrontend,
  showMessage,
} from "siyuan";
import { version as getAppVersion } from "@/api";
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
  executeExperimentalClickSequence,
  executeExperimentalShortcut,
  executeBuiltinCommandByDom,
  PLUGIN_COMMANDS,
} from "@/core/commands";
import { SurfaceManager } from "@/core/surfaces";
import { mountSettingsApp } from "@/main";
import { readNativeSurfaceSnapshot } from "@/shared/runtime-snapshot";
import type { PowerButtonsConfig } from "@/shared/types";

type Unmount = () => void;

export default class SiyuanPowerButtonsPlugin extends Plugin {
  private configStore = new ConfigStore(this);
  private appVersion: string | null = null;
  private surfaceManager: SurfaceManager | null = null;
  private settingsDialog: Dialog | null = null;
  private unmountSettingsApp: Unmount | null = null;
  private unsubscribeConfig: Unmount | null = null;
  private readonly pluginCommandHandlers = new Map<string, () => void | Promise<void>>();
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

  public readonly version = pluginInfo.version;

  async onload(): Promise<void> {
    await this.configStore.load();
    try {
      this.appVersion = await getAppVersion();
    } catch {
      this.appVersion = null;
    }
    this.registerPluginCommands();
    this.unsubscribeConfig = this.configStore.subscribe((config) => {
      this.surfaceManager?.render(config);
    });
  }

  onLayoutReady(): void {
    if (!this.canRenderSurfaces()) {
      return;
    }
    this.surfaceManager = new SurfaceManager(this, this.executor);
    this.surfaceManager.render(this.configStore.getConfig());
  }

  onunload(): void {
    this.unsubscribeConfig?.();
    this.surfaceManager?.destroy();
    this.surfaceManager = null;
    this.destroySettingsDialog();
  }

  openSetting(): void {
    this.destroySettingsDialog();

    this.settingsDialog = new Dialog({
      title: "思源快捷按钮设置",
      width: "1280px",
      height: "80vh",
      content: `<div class="siyuan-power-buttons-settings-host"></div>`,
      destroyCallback: () => {
        this.unmountSettingsApp?.();
        this.unmountSettingsApp = null;
        this.settingsDialog = null;
      },
    });

    const host = this.settingsDialog.element.querySelector<HTMLElement>(".siyuan-power-buttons-settings-host");
    if (!host) {
      return;
    }

    this.unmountSettingsApp = mountSettingsApp(host, {
      initialConfig: this.configStore.snapshot(),
      builtinCommands: BUILTIN_COMMANDS,
      pluginCommands: PLUGIN_COMMANDS,
      onChange: async (config) => {
        await this.configStore.replace(config);
      },
      onNotify: (message, type = "info") => {
        showMessage(message, 4000, type);
      },
      onReadCurrentLayout: () => {
        return readNativeSurfaceSnapshot(document);
      },
    });
  }

  private canRenderSurfaces(): boolean {
    const config = this.configStore.getConfig();
    const frontend = getFrontend();
    if (!config.desktopOnly) {
      return true;
    }
    return frontend === "desktop" || frontend === "desktop-window" || frontend === "browser-desktop";
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

  private registerPluginCommands(): void {
    this.pluginCommandHandlers.set("open-settings", () => {
      this.openSetting();
    });
    this.pluginCommandHandlers.set("copy-config-json", async () => {
      const serialized = exportConfigAsJson(this.configStore.snapshot());
      try {
        await navigator.clipboard.writeText(serialized);
        showMessage("快捷按钮配置已复制。");
      } catch {
        this.openSetting();
        showMessage("复制失败，已自动打开设置界面。", 5000, "error");
      }
    });
    this.pluginCommandHandlers.set("restore-defaults", async () => {
      const config = await this.configStore.reset();
      this.refreshSettingsDialog(config);
      showMessage("已恢复默认按钮配置。");
    });

    for (const command of PLUGIN_COMMANDS) {
      this.addCommand({
        langKey: `power-buttons-${command.id}`,
        langText: command.title,
        hotkey: "",
        callback: () => {
          void this.pluginCommandHandlers.get(command.id)?.();
        },
      });
    }
  }

  private refreshSettingsDialog(config: PowerButtonsConfig): void {
    if (!this.settingsDialog) {
      return;
    }
    this.destroySettingsDialog();
    this.openSetting();
    this.surfaceManager?.render(config);
  }

  private destroySettingsDialog(): void {
    this.unmountSettingsApp?.();
    this.unmountSettingsApp = null;
    this.settingsDialog?.destroy();
    this.settingsDialog = null;
  }
}
