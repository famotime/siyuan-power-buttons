// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { PLUGIN_COMMANDS } from "@/core/commands";
import { createDefaultConfig } from "@/core/config";
import { PowerButtonsRuntime } from "@/core/runtime/plugin-runtime";
import { SettingsDialogController } from "@/core/runtime/settings-dialog-controller";

function createDialogElement(): HTMLDivElement {
  const element = document.createElement("div");
  const host = document.createElement("div");
  host.className = "siyuan-power-buttons-settings-host";
  element.appendChild(host);
  return element;
}

describe("settings dialog controller", () => {
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
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn(),
    });
    controller.open({
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
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

    const surfaceManager = {
      render: vi.fn(),
      destroy: vi.fn(),
    };
    const settingsDialog = {
      open: vi.fn(),
      refresh: vi.fn(),
      destroy: vi.fn(),
    };
    const pluginCommandHandlers = new Map<string, () => void | Promise<void>>();
    const addCommand = vi.fn();
    const showMessage = vi.fn();
    const runtime = new PowerButtonsRuntime({
      plugin: {
        addCommand,
      },
      configStore,
      pluginCommands: PLUGIN_COMMANDS,
      pluginCommandHandlers,
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
    });

    return {
      addCommand,
      config,
      configListener: () => configListener,
      configStore,
      pluginCommandHandlers,
      runtime,
      settingsDialog,
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

  it("keeps the fixed open-settings plugin command even when default config has no settings surface button", async () => {
    const state = createRuntime();

    expect(state.config.items.some(item => item.actionType === "plugin-command" && item.actionId === "open-settings")).toBe(false);

    await state.runtime.onload();
    const openSettingsCommand = state.addCommand.mock.calls.find(call => call[0].langKey === "power-buttons-open-settings")?.[0];

    await openSettingsCommand?.callback();

    expect(openSettingsCommand?.langText).toBe("打开快捷按钮设置");
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
