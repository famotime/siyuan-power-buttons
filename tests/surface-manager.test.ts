/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { createDefaultConfig } from "@/core/config";
import { CommandExecutor } from "@/core/commands";
import { SurfaceManager } from "@/core/surfaces";

describe("surface manager", () => {
  it("renders top bar, status bar and dock entries, then destroys them cleanly", () => {
    const topBarElement = document.createElement("button");
    const statusElement = document.createElement("div");
    const removeDock = vi.fn();
    const addTopBar = vi.fn(() => topBarElement);
    const addStatusBar = vi.fn(() => statusElement);
    const addDock = vi.fn(() => ({
      model: {
        remove: removeDock,
      },
    }));
    const plugin = {
      addTopBar,
      addStatusBar,
      addDock,
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: {
        globalCommand: vi.fn(),
      },
      openSetting: vi.fn(),
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }));

    manager.render(createDefaultConfig());

    expect(addTopBar).toHaveBeenCalledTimes(1);
    expect(addStatusBar).toHaveBeenCalledTimes(1);
    expect(addDock).toHaveBeenCalledTimes(1);

    const statusOptions = addStatusBar.mock.calls[0][0];
    const statusButton = statusOptions.element as HTMLButtonElement;
    expect(statusButton.querySelector(".siyuan-power-buttons__label")).toBeNull();

    manager.destroy();

    expect(removeDock).toHaveBeenCalledTimes(1);
  });

  it("skips dock teardown when the registration model has no remove method", () => {
    const addTopBar = vi.fn(() => document.createElement("button"));
    const addStatusBar = vi.fn(() => document.createElement("div"));
    const addDock = vi.fn(() => ({
      model: {},
    }));
    const plugin = {
      addTopBar,
      addStatusBar,
      addDock,
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: {
        globalCommand: vi.fn(),
      },
      openSetting: vi.fn(),
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }));

    expect(() => manager.render(createDefaultConfig())).not.toThrow();
    expect(() => manager.destroy()).not.toThrow();
  });
});
