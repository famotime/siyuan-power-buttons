import {
  formatPluginCommandMenuTitle,
} from "@/core/commands";
import type { PluginCommandDefinition } from "@/shared/types";
import type { SettingsAppProps } from "@/features/settings/types";

type ConfigStoreLike<TConfig> = {
  load: () => Promise<TConfig>;
  getConfig: () => TConfig;
  snapshot: () => TConfig;
  replace: (config: TConfig) => Promise<TConfig>;
  reset: () => Promise<TConfig>;
  subscribe: (listener: (config: TConfig) => void) => () => void;
};

type SettingsUiStateStoreLike = {
  load: () => Promise<{ lastSelectedButtonId: string }>;
  snapshot: () => { lastSelectedButtonId: string };
  setLastSelectedButtonId: (itemId: string) => Promise<void>;
};

type SurfaceManagerLike<TConfig> = {
  render: (config: TConfig) => void;
  destroy: () => void;
};

type SettingsDialogLike = {
  open: (props: SettingsAppProps) => void;
  refresh: (props: SettingsAppProps) => void;
  destroy: () => void;
};

type ClipboardLike = {
  writeText: (value: string) => Promise<void>;
};

type PowerButtonsConfigLike = {
  desktopOnly: boolean;
};

type SurfaceFrontend = "desktop" | "desktop-window" | "browser-desktop" | string;

type ExternalCommandRegistryLike = {
  refresh: () => Promise<void>;
  listProviders: () => Array<{
    providerId: string;
    providerName: string;
    providerVersion?: string;
  }>;
  listCommands: (providerId: string) => Promise<Array<{
    id: string;
    title: string;
    description?: string;
    category?: string;
  }>>;
};

export class PowerButtonsRuntime<TConfig extends PowerButtonsConfigLike> {
  private surfaceManager: SurfaceManagerLike<TConfig> | null = null;
  private unsubscribeConfig: (() => void) | null = null;
  private externalCommandProviders: SettingsAppProps["externalCommandProviders"] = [];
  private lastSelectedButtonId = "";

  constructor(private readonly options: {
    plugin: {
      addCommand: (options: {
        langKey: string;
        langText: string;
        hotkey: string;
        callback: () => void;
      }) => void;
    };
    configStore: ConfigStoreLike<TConfig>;
    settingsUiStateStore: SettingsUiStateStoreLike;
    builtinCommands: SettingsAppProps["builtinCommands"];
    pluginCommands: PluginCommandDefinition[];
    pluginCommandHandlers: Map<string, () => void | Promise<void>>;
    externalCommands?: ExternalCommandRegistryLike;
    settingsDialog: SettingsDialogLike;
    createSurfaceManager: () => SurfaceManagerLike<TConfig>;
    executor: unknown;
    exportConfigAsJson: (config: TConfig) => string;
    clipboard: ClipboardLike;
    getFrontend: () => SurfaceFrontend;
    showMessage: (message: string, duration?: number, type?: "info" | "error") => void;
    t?: (key: string, replacements?: Record<string, string>) => string;
    openInBrowser?: () => void | Promise<void>;
    readCurrentLayout: NonNullable<SettingsAppProps["onReadCurrentLayout"]>;
  }) {}

  async onload(): Promise<void> {
    await this.options.configStore.load();
    this.lastSelectedButtonId = (await this.options.settingsUiStateStore.load()).lastSelectedButtonId;
    await this.refreshExternalCommandProviders();
    this.registerPluginCommands();
    this.unsubscribeConfig = this.options.configStore.subscribe((config) => {
      this.surfaceManager?.render(config);
    });
  }

  onLayoutReady(): void {
    if (!this.canRenderSurfaces()) {
      return;
    }
    this.surfaceManager = this.options.createSurfaceManager();
    this.surfaceManager.render(this.options.configStore.getConfig());
  }

  onunload(): void {
    this.unsubscribeConfig?.();
    this.unsubscribeConfig = null;
    this.surfaceManager?.destroy();
    this.surfaceManager = null;
    this.options.settingsDialog.destroy();
  }

  private t(key: string, replacements?: Record<string, string>): string {
    return this.options.t?.(key, replacements) ?? key;
  }

  private canRenderSurfaces(): boolean {
    const config = this.options.configStore.getConfig();
    const frontend = this.options.getFrontend();
    if (!config.desktopOnly) {
      return true;
    }
    return frontend === "desktop" || frontend === "desktop-window" || frontend === "browser-desktop";
  }

  private async refreshExternalCommandProviders(): Promise<SettingsAppProps["externalCommandProviders"]> {
    if (!this.options.externalCommands) {
      this.externalCommandProviders = [];
      return this.externalCommandProviders;
    }

    try {
      await this.options.externalCommands.refresh();
      this.externalCommandProviders = await Promise.all(
        this.options.externalCommands.listProviders().map(async provider => ({
          ...provider,
          commands: await this.options.externalCommands!.listCommands(provider.providerId),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.showMessage(this.t("pluginCommandLoadFailed", { message }), 5000, "error");
    }

    return this.externalCommandProviders;
  }

  private createSettingsAppProps(): SettingsAppProps {
    return {
      initialConfig: this.options.configStore.snapshot(),
      initialSelectedButtonId: this.lastSelectedButtonId,
      builtinCommands: this.options.builtinCommands,
      pluginCommands: this.options.pluginCommands,
      externalCommandProviders: this.externalCommandProviders,
      onChange: async config => this.options.configStore.replace(config as TConfig),
      onNotify: (message, type = "info") => {
        this.options.showMessage(message, 4000, type);
      },
      onSelectedIdChange: async itemId => {
        this.lastSelectedButtonId = itemId;
        await this.options.settingsUiStateStore.setLastSelectedButtonId(itemId);
      },
      onRefreshExternalCommands: this.options.externalCommands
        ? () => this.refreshExternalCommandProviders()
        : undefined,
      onReadCurrentLayout: this.options.readCurrentLayout,
    };
  }

  async openSetting(): Promise<void> {
    await this.refreshExternalCommandProviders();
    this.lastSelectedButtonId = (await this.options.settingsUiStateStore.load()).lastSelectedButtonId;
    this.options.settingsDialog.destroy();
    this.options.settingsDialog.open(this.createSettingsAppProps());
  }

  private registerPluginCommands(): void {
    this.options.pluginCommandHandlers.set("open-settings", () => {
      return this.openSetting();
    });
    this.options.pluginCommandHandlers.set("copy-config-json", async () => {
      const serialized = this.options.exportConfigAsJson(this.options.configStore.snapshot());
      try {
        await this.options.clipboard.writeText(serialized);
      } catch {
        await this.openSetting();
        this.options.showMessage(this.t("copyConfigFailed"), 5000, "error");
      }
    });
    this.options.pluginCommandHandlers.set("restore-defaults", async () => {
      const config = await this.options.configStore.reset();
      this.options.settingsDialog.refresh(this.createSettingsAppProps());
      this.surfaceManager?.render(config);
    });
    this.options.pluginCommandHandlers.set("open-in-browser", async () => {
      const url = getCurrentWorkspaceServerUrl();
      const openPromise = (async () => {
        try {
          if (this.options.openInBrowser) {
            await this.options.openInBrowser();
          } else {
            openCurrentWorkspaceInBrowser();
          }
        } catch (error) {
          console.error("Failed to open browser:", error);
        }
      })();

      const copyPromise = (async () => {
        try {
          await this.options.clipboard.writeText(url);
          this.options.showMessage(this.t("copiedServerUrlToClipboard"), 3000, "info");
        } catch {
          this.options.showMessage(this.t("copyServerUrlFailed"), 5000, "error");
        }
      })();

      await Promise.all([openPromise, copyPromise]);
    });

    for (const command of this.options.pluginCommands) {
      this.options.plugin.addCommand({
        langKey: `power-buttons-${command.id}`,
        langText: formatPluginCommandMenuTitle(command.title),
        hotkey: "",
        callback: () => {
          return this.options.pluginCommandHandlers.get(command.id)?.();
        },
      });
    }
  }
}

/**
 * 获取思源笔记当前工作空间的本地伺服网址（形如 http://127.0.0.1:6806）。
 */
export function getCurrentWorkspaceServerUrl(windowTarget?: Window): string {
  const target = windowTarget ?? (typeof window !== "undefined" ? window : undefined);
  const port = target?.location?.port || "6806";
  return `http://127.0.0.1:${port}`;
}

/**
 * 在系统外部默认浏览器中打开思源笔记当前工作空间的伺服网页端。
 * 在桌面端 Electron 运行环境下，window.open 会被全局拦截并通过 shell.openExternal 调用系统默认浏览器。
 */
export function openCurrentWorkspaceInBrowser(windowTarget: Window = window): void {
  const url = getCurrentWorkspaceServerUrl(windowTarget);
  windowTarget.open(url, "_blank", "noopener,noreferrer");
}

