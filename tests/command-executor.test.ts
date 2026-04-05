import { describe, expect, it, vi } from "vitest";
import {
  BUILTIN_COMMANDS,
  CommandExecutor,
} from "@/core/commands";
import type { PowerButtonItem } from "@/shared/types";

describe("command executor", () => {
  const createItem = (overrides: Partial<PowerButtonItem>): PowerButtonItem => ({
    id: "item-1",
    title: "Test",
    visible: true,
    iconType: "builtin",
    iconValue: "iconInfo",
    surface: "topbar",
    order: 0,
    actionType: "builtin-global-command",
    actionId: "globalSearch",
    tooltip: "",
    ...overrides,
  });

  it("exposes a stable built-in command catalog", () => {
    expect(BUILTIN_COMMANDS.some(command => command.id === "globalSearch")).toBe(true);
    expect(BUILTIN_COMMANDS.some(command => command.id === "config")).toBe(true);
    expect(BUILTIN_COMMANDS.every(command => command.title.length > 0)).toBe(true);
  });

  it("dispatches built-in global commands through the plugin API", async () => {
    const globalCommand = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
      openSetting: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
    });

    await executor.execute(createItem({}));

    expect(globalCommand).toHaveBeenCalledWith("globalSearch");
  });

  it("falls back to the injected builtin runner when plugin globalCommand is unavailable", async () => {
    const runBuiltinCommand = vi.fn(() => true);
    const notify = vi.fn();
    const executor = new CommandExecutor({
      plugin: {} as never,
      notify,
      openUrl: vi.fn(),
      openSetting: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand,
    });

    await executor.execute(createItem({}));

    expect(runBuiltinCommand).toHaveBeenCalledWith("globalSearch");
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies instead of failing silently when a builtin command cannot be executed", async () => {
    const notify = vi.fn();
    const executor = new CommandExecutor({
      plugin: {} as never,
      notify,
      openUrl: vi.fn(),
      openSetting: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(() => false),
    });

    await executor.execute(createItem({}));

    expect(notify).toHaveBeenCalledWith("内置命令当前无法执行：globalSearch", "error");
  });

  it("dispatches plugin commands and urls through injected handlers", async () => {
    const pluginAction = vi.fn();
    const openUrl = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      openUrl,
      openSetting: vi.fn(),
      pluginCommands: new Map([["open-help", pluginAction]]),
      runBuiltinCommand: vi.fn(),
    });

    await executor.execute(createItem({
      actionType: "plugin-command",
      actionId: "open-help",
    }));
    await executor.execute(createItem({
      actionType: "open-url",
      actionId: "https://example.com",
    }));

    expect(pluginAction).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("supports custom actions such as opening settings", async () => {
    const openSetting = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
      openSetting,
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
    });

    await executor.execute(createItem({
      actionType: "custom-action",
      actionId: "open-settings",
    }));

    expect(openSetting).toHaveBeenCalledTimes(1);
  });

  it("dispatches experimental shortcuts through the injected runner", async () => {
    const runExperimentalShortcut = vi.fn(() => true);
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
      openSetting: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
      runExperimentalShortcut,
    });

    const item = createItem({
      actionType: "experimental-shortcut" as never,
      actionId: "Ctrl+B",
      experimentalShortcut: {
        shortcut: "Ctrl+B",
        sendEscapeBefore: true,
        dispatchTarget: "active-editor",
        allowDirectWindowDispatch: false,
      },
    });

    await executor.execute(item);

    expect(runExperimentalShortcut).toHaveBeenCalledWith(item);
  });

  it("notifies when an experimental shortcut cannot be executed", async () => {
    const notify = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify,
      openUrl: vi.fn(),
      openSetting: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
      runExperimentalShortcut: vi.fn(() => false),
    });

    await executor.execute(createItem({
      actionType: "experimental-shortcut" as never,
      actionId: "Ctrl+B",
      experimentalShortcut: {
        shortcut: "Ctrl+B",
        sendEscapeBefore: false,
        dispatchTarget: "auto",
        allowDirectWindowDispatch: false,
      },
    }));

    expect(notify).toHaveBeenCalledWith("实验快捷键当前无法执行：Ctrl+B", "error");
  });
});
