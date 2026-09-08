import {
  Dialog,
  Plugin,
  fetchSyncPost,
  getFrontend,
  openSetting,
  openTab,
  showMessage,
} from "siyuan";
import type { IMenuItem } from "siyuan";
import pluginInfo from "@/../plugin.json";
import {
  ConfigStore,
  exportConfigAsJson,
  SettingsUiStateStore,
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
  executeBuiltinCommandStable,
  PLUGIN_COMMANDS,
} from "@/core/commands";
import { PowerButtonsRuntime, openCurrentWorkspaceInBrowser } from "@/core/runtime/plugin-runtime";
import {
  collectInstalledPlugins,
  createExperimentalActionRunners,
} from "@/core/runtime/runtime-factory";
import { SettingsDialogController } from "@/core/runtime/settings-dialog-controller";
import { getAppVersion } from "@/core/system/app-version";
import { SurfaceManager } from "@/core/surfaces";
import { customizeSelectionToolbar } from "@/core/surfaces/selection-toolbar-manager";
import { mountSettingsApp } from "@/main";
import {
  CONFIG_STORAGE_NAME,
  SETTINGS_UI_STORAGE_NAME,
} from "@/shared/constants";
import { readNativeSurfaceSnapshot } from "@/shared/runtime-snapshot";
import {
  getSiyuanBazaarConfig,
  getSiyuanKeymap,
  getSiyuanGlobalPlugins,
} from "@/types/siyuan-globals";

export default class SiyuanPowerButtonsPlugin extends Plugin {
  private configStore = new ConfigStore(this);
  private settingsUiStateStore = new SettingsUiStateStore(this);
  private appVersion: string | null = null;
  private readonly pluginCommandHandlers = new Map<string, () => void | Promise<void>>();
  private readonly externalCommands = new ExternalCommandRegistry({
    getPlugins: () => this.getInstalledPlugins(),
  });
  private readonly runBuiltinCommandStable = (commandId: string) => executeBuiltinCommandStable(commandId, {
    app: this.app,
    openAppSetting: app => openSetting(app as never),
    openTab: options => openTab(options as never),
    fetchPost: (url, data) => fetchSyncPost(url, data),
    getBazaarConfig: () => getSiyuanBazaarConfig(),
    reloadWindow: () => window.location.reload(),
    runBuiltinCommandByDom: targetCommandId => executeBuiltinCommandByDom(targetCommandId, document),
  });
  private readonly experimentalActionRunners = createExperimentalActionRunners({
    getExperimentalSupport: feature => this.getExperimentalSupport(feature),
    showMessage,
    t: (key: string, replacements?: Record<string, string>) => this.t(key, replacements),
    getKeymap: () => getSiyuanKeymap(),
    pluginGlobalCommand: (commandId: string) => {
      const pluginWithGlobal = this as Plugin & { globalCommand?: (command: string) => void };
      pluginWithGlobal.globalCommand?.(commandId);
    },
    pluginCommandHandlers: this.pluginCommandHandlers,
    runBuiltinCommandByDom: commandId => this.runBuiltinCommandStable(commandId),
    executeExperimentalShortcut,
    executeExperimentalClickSequence,
    document,
    windowTarget: window,
  });
  private executor = new CommandExecutor({
    plugin: this as Plugin & { globalCommand?: (command: string) => void },
    notify: (message, type = "info") => {
      showMessage(message, 5000, type);
    },
    t: (key: string, replacements?: Record<string, string>) => this.t(key, replacements),
    pluginCommands: this.pluginCommandHandlers,
    externalCommands: this.externalCommands,
    openUrl: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    runBuiltinCommand: commandId => this.runBuiltinCommandStable(commandId),
    runExperimentalShortcut: item => this.experimentalActionRunners.runExperimentalShortcut(item),
    runExperimentalClickSequence: item => this.experimentalActionRunners.runExperimentalClickSequence(item),
    sourcePluginVersion: pluginInfo.version,
  });
  private runtime = new PowerButtonsRuntime({
    plugin: this,
    configStore: this.configStore,
    settingsUiStateStore: this.settingsUiStateStore,
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
    openInBrowser: () => openCurrentWorkspaceInBrowser(window),
    t: (key: string, replacements?: Record<string, string>) => this.t(key, replacements),
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
    void this.runtime.openSetting();
  }

  onunload(): void {
    this.runtime.onunload();
  }

  updateProtyleToolbar(toolbar: Array<string | IMenuItem>): Array<string | IMenuItem> {
    if (!this.configStore) {
      return toolbar;
    }
    return customizeSelectionToolbar(
      toolbar,
      this.configStore.getConfig(),
      this.executor,
    );
  }

  async uninstall(): Promise<void> {
    const removals = await Promise.allSettled([
      this.removeData(CONFIG_STORAGE_NAME),
      this.removeData(SETTINGS_UI_STORAGE_NAME),
    ]);

    removals.forEach((result, index) => {
      if (result.status === "rejected") {
        const storageName = index === 0 ? CONFIG_STORAGE_NAME : SETTINGS_UI_STORAGE_NAME;
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        showMessage(this.t("uninstallDataRemoveFailed", { name: this.name, storageName, message }), 5000, "error");
      }
    });
  }

  private getInstalledPlugins() {
    const appPlugins = Array.isArray(this.app?.plugins)
      ? this.app.plugins
      : [];
    const globalPlugins = getSiyuanGlobalPlugins();

    return collectInstalledPlugins(appPlugins, globalPlugins);
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
