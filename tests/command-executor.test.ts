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
      openUrl: vi.fn(),
      openSetting: vi.fn(),
      pluginCommands: new Map(),
    });

    await executor.execute(createItem({}));

    expect(globalCommand).toHaveBeenCalledWith("globalSearch");
  });

  it("dispatches plugin commands and urls through injected handlers", async () => {
    const pluginAction = vi.fn();
    const openUrl = vi.fn();
    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      openUrl,
      openSetting: vi.fn(),
      pluginCommands: new Map([["open-help", pluginAction]]),
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
      openUrl: vi.fn(),
      openSetting,
      pluginCommands: new Map(),
    });

    await executor.execute(createItem({
      actionType: "custom-action",
      actionId: "open-settings",
    }));

    expect(openSetting).toHaveBeenCalledTimes(1);
  });
});
