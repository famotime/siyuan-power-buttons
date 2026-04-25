// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { PLUGIN_COMMANDS } from "@/core/commands";
import { createDefaultConfig } from "@/core/config";
import { PowerButtonsRuntime } from "@/core/runtime/plugin-runtime";
import { SettingsDialogController } from "@/core/runtime/settings-dialog-controller";
import { mountSettingsApp } from "@/main";

function createDialogElement(): HTMLDivElement {
  const element = document.createElement("div");
  const host = document.createElement("div");
  host.className = "siyuan-power-buttons-settings-host";
  element.appendChild(host);
  return element;
}

describe("settings dialog controller", () => {
  it("restores the last selected button when reopening with the real settings app mount flow", async () => {
    const hostRoot = document.createElement("div");
    document.body.appendChild(hostRoot);

    const settingsUiState = {
      lastSelectedButtonId: "",
    };
    let currentDialogDestroyCallback: (() => void) | undefined;
    const createDialog = vi.fn((options: {
      destroyCallback: () => void;
      content: string;
      title: string;
      width: string;
      height: string;
    }) => {
      currentDialogDestroyCallback = options.destroyCallback;
      const element = document.createElement("div");
      element.innerHTML = options.content;
      hostRoot.replaceChildren(element);
      return {
        element,
        destroy: () => {
          currentDialogDestroyCallback?.();
          hostRoot.replaceChildren();
        },
      };
    });
    const controller = new SettingsDialogController({
      createDialog,
      mountSettingsApp,
    });
    const props = {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      externalCommandProviders: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onSelectedIdChange: async (itemId: string) => {
        settingsUiState.lastSelectedButtonId = itemId;
      },
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    };

    controller.open({
      ...props,
      initialSelectedButtonId: settingsUiState.lastSelectedButtonId,
    });

    const listButtons = Array.from(hostRoot.querySelectorAll<HTMLButtonElement>(".button-list__main"));
    listButtons[1]?.click();
    controller.destroy();

    controller.open({
      ...props,
      initialSelectedButtonId: settingsUiState.lastSelectedButtonId,
    });

    const activeItem = hostRoot.querySelector(".button-list__item.is-active strong");
    expect(settingsUiState.lastSelectedButtonId).toBeTruthy();
    expect(activeItem?.textContent?.trim()).toBe("最近文档");
  });

  it("persists the latest selected button id before teardown", () => {
    const unmount = vi.fn() as (() => void) & { getSelectedButtonId?: () => string };
    unmount.getSelectedButtonId = () => "second-button";
    const onSelectedIdChange = vi.fn().mockResolvedValue(undefined);
    const createDialog = vi.fn().mockReturnValue({
      element: createDialogElement(),
      destroy: vi.fn(),
    });
    const mountSettingsApp = vi.fn().mockReturnValue(unmount);

    const controller = new SettingsDialogController({
      createDialog,
      mountSettingsApp,
    });

    controller.open({
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      externalCommandProviders: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onSelectedIdChange,
      onReadCurrentLayout: vi.fn(),
    });
    controller.destroy();

    expect(onSelectedIdChange).toHaveBeenCalledWith("second-button");
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it("mounts into the dialog host and tears down the previous instance before reopening", () => {
    const firstUnmount = vi.fn();
    const secondUnmount = vi.fn();
    const firstDestroy = vi.fn();
    const secondDestroy = vi.fn();
    const mountSettingsApp = vi.fn()
      .mockReturnValueOnce(firstUnmount)
      .mockReturnValueOnce(secondUnmount);
    const createDialog = vi.fn()
      .mockReturnValueOnce({
        element: createDialogElement(),
        destroy: firstDestroy,
      })
      .mockReturnValueOnce({
        element: createDialogElement(),
        destroy: secondDestroy,
      });

    const controller = new SettingsDialogController({
      createDialog,
      mountSettingsApp,
    });

    controller.open({
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      externalCommandProviders: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn(),
    });
    controller.open({
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      externalCommandProviders: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn(),
    });
    controller.destroy();

    expect(mountSettingsApp).toHaveBeenCalledTimes(2);
    expect(firstUnmount).toHaveBeenCalledTimes(1);
    expect(firstDestroy).toHaveBeenCalledTimes(1);
    expect(secondUnmount).toHaveBeenCalledTimes(1);
    expect(secondDestroy).toHaveBeenCalledTimes(1);
  });
});

describe("plugin runtime", () => {
  function createRuntime(options: {
    clipboardShouldFail?: boolean;
    frontend?: string;
    desktopOnly?: boolean;
    lastSelectedButtonId?: string;
    destroySelectedButtonId?: string;
    externalCommands?: {
      refresh: () => Promise<void>;
      listProviders: () => Array<{ providerId: string; providerName: string; providerVersion?: string }>;
      listCommands: (providerId: string) => Promise<Array<{ id: string; title: string; description?: string; category?: string }>>;
    };
  } = {}) {
    const config = createDefaultConfig();
    config.desktopOnly = options.desktopOnly ?? true;

    const unsubscribe = vi.fn();
    let configListener: ((nextConfig: typeof config) => void) | undefined;

    const configStore = {
      load: vi.fn().mockResolvedValue(config),
      getConfig: vi.fn(() => config),
      snapshot: vi.fn(() => structuredClone(config)),
      replace: vi.fn().mockResolvedValue(config),
      reset: vi.fn().mockResolvedValue(config),
      subscribe: vi.fn((listener: (nextConfig: typeof config) => void) => {
        configListener = listener;
        return unsubscribe;
      }),
    };
    let persistedSelectedButtonId = options.lastSelectedButtonId ?? '';
    const settingsUiStateStore = {
      load: vi.fn().mockImplementation(async () => ({
        lastSelectedButtonId: persistedSelectedButtonId,
      })),
      snapshot: vi.fn(() => ({
        lastSelectedButtonId: persistedSelectedButtonId,
      })),
      setLastSelectedButtonId: vi.fn().mockResolvedValue(undefined),
    };

    const surfaceManager = {
      render: vi.fn(),
      destroy: vi.fn(),
    };
    let latestSettingsProps: Parameters<typeof settingsDialog.open>[0] | undefined;
    const settingsDialog = {
      open: vi.fn((props) => {
        latestSettingsProps = props;
      }),
      refresh: vi.fn(),
      destroy: vi.fn(async () => {
        if (options.destroySelectedButtonId && latestSettingsProps?.onSelectedIdChange) {
          await latestSettingsProps.onSelectedIdChange(options.destroySelectedButtonId);
          persistedSelectedButtonId = options.destroySelectedButtonId;
        }
      }),
    };
    const pluginCommandHandlers = new Map<string, () => void | Promise<void>>();
    const addCommand = vi.fn();
    const showMessage = vi.fn();
    const runtime = new PowerButtonsRuntime({
      plugin: {
        addCommand,
      },
      configStore,
      settingsUiStateStore,
      builtinCommands: [],
      pluginCommands: PLUGIN_COMMANDS,
      pluginCommandHandlers,
      externalCommands: options.externalCommands,
      settingsDialog,
      createSurfaceManager: vi.fn(() => surfaceManager),
      executor: {} as never,
      exportConfigAsJson: vi.fn(() => "{\n  \"version\": 2\n}\n"),
      clipboard: {
        writeText: options.clipboardShouldFail
          ? vi.fn().mockRejectedValue(new Error("clipboard denied"))
          : vi.fn().mockResolvedValue(undefined),
      },
      getFrontend: () => options.frontend ?? "desktop",
      showMessage,
      readCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    return {
      addCommand,
      config,
      configListener: () => configListener,
      configStore,
      pluginCommandHandlers,
      runtime,
      settingsDialog,
      settingsUiStateStore,
      setPersistedSelectedButtonId: (value: string) => {
        persistedSelectedButtonId = value;
      },
      showMessage,
      surfaceManager,
      unsubscribe,
    };
  }

  it("registers plugin commands and copies serialized config to the clipboard", async () => {
    const state = createRuntime();

    await state.runtime.onload();
    const copyConfigCommand = state.addCommand.mock.calls.find(call => call[0].langKey === "power-buttons-copy-config-json")?.[0];

    await copyConfigCommand?.callback();

    expect(state.addCommand).toHaveBeenCalledTimes(PLUGIN_COMMANDS.length);
    expect(state.showMessage).toHaveBeenCalledWith("快捷按钮配置已复制。");
    expect(state.settingsDialog.open).not.toHaveBeenCalled();
  });

  it("falls back to opening settings when clipboard copy fails", async () => {
    const state = createRuntime({ clipboardShouldFail: true });

    await state.runtime.onload();
    const copyConfigCommand = state.addCommand.mock.calls.find(call => call[0].langKey === "power-buttons-copy-config-json")?.[0];

    await copyConfigCommand?.callback();

    expect(state.settingsDialog.open).toHaveBeenCalledTimes(1);
    expect(state.showMessage).toHaveBeenCalledWith("复制失败，已自动打开设置界面。", 5000, "error");
  });

  it("registers plugin command handlers into the shared runtime map for surface actions", async () => {
    const state = createRuntime();

    await state.runtime.onload();
    await state.pluginCommandHandlers.get("open-settings")?.();

    expect(state.pluginCommandHandlers.has("open-settings")).toBe(true);
    expect(state.settingsDialog.open).toHaveBeenCalledTimes(1);
  });

  it("passes discovered external providers into the settings app props", async () => {
    const state = createRuntime({
      externalCommands: {
        refresh: vi.fn().mockResolvedValue(undefined),
        listProviders: () => [
          {
            providerId: "siyuan-doc-assist",
            providerName: "文档助手 / Doc Assist",
          },
        ],
        listCommands: vi.fn().mockResolvedValue([
          {
            id: "insert-doc-summary",
            title: "插入文档摘要",
          },
        ]),
      },
    });

    await state.runtime.onload();
    await state.runtime.openSetting();

    expect(state.settingsDialog.open).toHaveBeenCalledWith(expect.objectContaining({
      externalCommandProviders: [
        {
          providerId: "siyuan-doc-assist",
          providerName: "文档助手 / Doc Assist",
          commands: [
            {
              id: "insert-doc-summary",
              title: "插入文档摘要",
            },
          ],
        },
      ],
    }));
  });

  it("passes the last selected button id into the settings app props", async () => {
    const state = createRuntime({
      lastSelectedButtonId: "daily-note-button",
    });

    await state.runtime.onload();
    await state.runtime.openSetting();

    expect(state.settingsDialog.open).toHaveBeenCalledWith(expect.objectContaining({
      initialSelectedButtonId: "daily-note-button",
      onSelectedIdChange: expect.any(Function),
    }));
  });

  it("reuses the flushed selected button id when reopening settings", async () => {
    const state = createRuntime({
      lastSelectedButtonId: "first-button",
      destroySelectedButtonId: "second-button",
    });

    await state.runtime.onload();
    await state.runtime.openSetting();
    await state.runtime.openSetting();

    expect(state.settingsDialog.open).toHaveBeenNthCalledWith(1, expect.objectContaining({
      initialSelectedButtonId: "first-button",
    }));
    expect(state.settingsDialog.open).toHaveBeenNthCalledWith(2, expect.objectContaining({
      initialSelectedButtonId: "second-button",
    }));
  });

  it("reloads the persisted selected button id before reopening settings", async () => {
    const state = createRuntime({
      lastSelectedButtonId: "first-button",
    });

    await state.runtime.onload();
    await state.runtime.openSetting();

    state.setPersistedSelectedButtonId("second-button");
    await state.runtime.openSetting();

    expect(state.settingsDialog.open).toHaveBeenNthCalledWith(2, expect.objectContaining({
      initialSelectedButtonId: "second-button",
    }));
  });

  it("refreshes external providers again when opening settings", async () => {
    let providerTitle = "旧命令";
    const state = createRuntime({
      externalCommands: {
        refresh: vi.fn().mockResolvedValue(undefined),
        listProviders: () => [
          {
            providerId: "siyuan-doc-assist",
            providerName: "文档助手 / Doc Assist",
          },
        ],
        listCommands: vi.fn().mockImplementation(async () => [
          {
            id: "insert-doc-summary",
            title: providerTitle,
          },
        ]),
      },
    });

    await state.runtime.onload();
    providerTitle = "新命令";
    await state.runtime.openSetting();

    expect(state.settingsDialog.open).toHaveBeenCalledWith(expect.objectContaining({
      externalCommandProviders: [
        expect.objectContaining({
          commands: [
            {
              id: "insert-doc-summary",
              title: "新命令",
            },
          ],
        }),
      ],
    }));
  });

  it("degrades gracefully when external provider refresh fails during startup and settings open", async () => {
    const refresh = vi.fn()
      .mockRejectedValueOnce(new Error("registry offline"))
      .mockRejectedValueOnce(new Error("registry offline"));
    const state = createRuntime({
      externalCommands: {
        refresh,
        listProviders: () => [
          {
            providerId: "siyuan-doc-assist",
            providerName: "文档助手 / Doc Assist",
          },
        ],
        listCommands: vi.fn().mockResolvedValue([
          {
            id: "insert-doc-summary",
            title: "插入文档摘要",
          },
        ]),
      },
    });

    await expect(state.runtime.onload()).resolves.toBeUndefined();
    await expect(state.runtime.openSetting()).resolves.toBeUndefined();

    expect(state.addCommand).toHaveBeenCalledTimes(PLUGIN_COMMANDS.length);
    expect(state.settingsDialog.open).toHaveBeenCalledWith(expect.objectContaining({
      externalCommandProviders: [],
    }));
    expect(state.showMessage).toHaveBeenCalledWith("读取插件命令失败：registry offline", 5000, "error");
  });

  it("keeps the fixed open-settings plugin command even when the default config already includes a settings button", async () => {
    const state = createRuntime();

    expect(state.config.items.some(item => item.actionType === "plugin-command" && item.actionId === "siyuan-power-buttons:open-settings")).toBe(true);

    await state.runtime.onload();
    const openSettingsCommand = state.addCommand.mock.calls.find(call => call[0].langKey === "power-buttons-open-settings")?.[0];

    await openSettingsCommand?.callback();

    expect(openSettingsCommand?.langText).toBe("动作类型（插件命令）-随心按-打开随心按设置");
    expect(state.settingsDialog.open).toHaveBeenCalledTimes(1);
  });

  it("creates, updates, and destroys the surface manager across lifecycle hooks", async () => {
    const state = createRuntime({ frontend: "desktop" });

    await state.runtime.onload();
    state.runtime.onLayoutReady();
    state.configListener()?.(state.config);
    state.runtime.onunload();

    expect(state.surfaceManager.render).toHaveBeenCalledWith(state.config);
    expect(state.surfaceManager.destroy).toHaveBeenCalledTimes(1);
    expect(state.unsubscribe).toHaveBeenCalledTimes(1);
    expect(state.settingsDialog.destroy).toHaveBeenCalledTimes(1);
  });

  it("skips surface rendering on non-desktop frontends when desktopOnly is enabled", async () => {
    const state = createRuntime({ frontend: "mobile", desktopOnly: true });

    await state.runtime.onload();
    state.runtime.onLayoutReady();

    expect(state.surfaceManager.render).not.toHaveBeenCalled();
  });
});
