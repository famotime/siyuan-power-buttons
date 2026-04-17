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
    const runBuiltinCommand = vi.fn(() => true);
    const executor = new CommandExecutor({
      plugin: { globalCommand } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand,
    });

    await executor.execute(createItem({}));

    expect(runBuiltinCommand).toHaveBeenCalledWith("globalSearch");
    expect(globalCommand).not.toHaveBeenCalled();
  });

  it("falls back to the undocumented plugin global command when the stable builtin runner cannot execute", async () => {
    const runBuiltinCommand = vi.fn(() => true);
    const globalCommand = vi.fn();
    const notify = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand } as never,
      notify,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(() => false),
    });

    await executor.execute(createItem({}));

    expect(globalCommand).toHaveBeenCalledWith("globalSearch");
    expect(notify).not.toHaveBeenCalled();
  });

  it("keeps config as a builtin command and delegates it to the injected stable runner", async () => {
    const runBuiltinCommand = vi.fn(() => true);
    const globalCommand = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand,
    });

    await executor.execute(createItem({
      actionId: "config",
    }));

    expect(runBuiltinCommand).toHaveBeenCalledWith("config");
    expect(globalCommand).not.toHaveBeenCalled();
  });

  it("notifies instead of failing silently when a builtin command cannot be executed", async () => {
    const notify = vi.fn();
    const executor = new CommandExecutor({
      plugin: {} as never,
      notify,
      openUrl: vi.fn(),
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
      pluginCommands: new Map([["open-help", pluginAction]]),
      runBuiltinCommand: vi.fn(),
    });

    await executor.execute(createItem({
      actionType: "plugin-command",
      actionId: "siyuan-power-buttons:open-help",
    }));
    await executor.execute(createItem({
      actionType: "open-url",
      actionId: "https://example.com",
    }));

    expect(pluginAction).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("dispatches external plugin commands through the unified plugin-command action type", async () => {
    const invokeCommand = vi.fn().mockResolvedValue({ ok: true, alreadyNotified: true });
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
      externalCommands: {
        refresh: vi.fn().mockResolvedValue(undefined),
        getProvider: vi.fn(() => ({
          protocol: "power-buttons-command-provider" as const,
          protocolVersion: 1 as const,
          providerId: "siyuan-doc-assist",
          providerName: "文档助手 / Doc Assist",
          listCommands: vi.fn(),
          invokeCommand,
        })),
      },
    });

    await executor.execute(createItem({
      id: "doc-summary",
      surface: "topbar",
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:insert-doc-summary",
    }));

    expect(invokeCommand).toHaveBeenCalledWith("insert-doc-summary", {
      trigger: "button-click",
      sourcePlugin: "siyuan-power-buttons",
      surface: "topbar",
      buttonId: "doc-summary",
    });
  });

  it("refreshes external providers once before reporting a missing provider", async () => {
    const notify = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const getProvider = vi.fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null);
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
      externalCommands: {
        refresh,
        getProvider,
      },
    });

    await executor.execute(createItem({
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:insert-doc-summary",
    }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("未检测到插件：siyuan-doc-assist", "error");
  });

  it("notifies when plugin command provider refresh itself fails", async () => {
    const notify = vi.fn();
    const refresh = vi.fn().mockRejectedValue(new Error("registry offline"));
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
      externalCommands: {
        refresh,
        getProvider: vi.fn(() => null),
      },
    });

    await expect(executor.execute(createItem({
      actionType: "plugin-command",
      actionId: "siyuan-doc-assist:insert-doc-summary",
    }))).resolves.toBeUndefined();

    expect(notify).toHaveBeenCalledWith("读取插件命令失败：registry offline", "error");
  });

  it("dispatches experimental shortcuts through the injected runner", async () => {
    const runExperimentalShortcut = vi.fn(() => true);
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
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

  it("dispatches experimental click sequences through the injected runner", async () => {
    const runExperimentalClickSequence = vi.fn(() => true);
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
      runExperimentalClickSequence,
    });

    const item = createItem({
      actionType: "experimental-click-sequence" as never,
      actionId: "barSettings",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "barSettings",
            timeoutMs: 3000,
            retryCount: 1,
            retryDelayMs: 100,
            delayAfterMs: 50,
          },
        ],
      },
    });

    await executor.execute(item);

    expect(runExperimentalClickSequence).toHaveBeenCalledWith(item);
  });

  it("notifies when an experimental click sequence cannot be executed", async () => {
    const notify = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand: vi.fn(),
      runExperimentalClickSequence: vi.fn(() => false),
    });

    await executor.execute(createItem({
      actionType: "experimental-click-sequence" as never,
      actionId: "barSettings",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "barSettings",
            timeoutMs: 3000,
            retryCount: 1,
            retryDelayMs: 100,
            delayAfterMs: 50,
          },
        ],
      },
    }));

    expect(notify).toHaveBeenCalledWith("实验点击序列当前无法执行：barSettings", "error");
  });
});
