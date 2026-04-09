/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { createDefaultConfig } from "@/core/config";
import { CommandExecutor } from "@/core/commands";
import { SurfaceManager } from "@/core/surfaces";

describe("surface manager", () => {
  it("renders a fixed open-settings top bar entry before config-driven top bar buttons", async () => {
    const fixedSettingsHandler = vi.fn();
    const topBarElements = [document.createElement("button"), document.createElement("button")];
    const addTopBar = vi.fn(() => topBarElements.shift() ?? document.createElement("button"));
    const plugin = {
      addTopBar,
      addStatusBar: vi.fn(() => document.createElement("div")),
      addDock: vi.fn(),
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: {
        globalCommand: vi.fn(),
      },
      openUrl: vi.fn(),
      pluginCommands: new Map([
        ["open-settings", fixedSettingsHandler],
      ]),
    }));

    manager.render(createDefaultConfig());

    expect(addTopBar).toHaveBeenCalledTimes(2);
    expect(addTopBar.mock.calls[0][0]).toMatchObject({
      icon: "iconSettings",
      title: "打开快捷按钮设置",
    });

    await addTopBar.mock.calls[0][0].callback();

    expect(fixedSettingsHandler).toHaveBeenCalledTimes(1);
  });

  it("renders top bar and status bar entries, then destroys them cleanly", () => {
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
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }));

    manager.render(createDefaultConfig());

    expect(addTopBar).toHaveBeenCalledTimes(2);
    expect(addStatusBar).toHaveBeenCalledTimes(1);
    expect(addDock).not.toHaveBeenCalled();

    const statusOptions = addStatusBar.mock.calls[0][0];
    const statusButton = statusOptions.element as HTMLButtonElement;
    expect(statusButton.querySelector(".siyuan-power-buttons__label")).toBeNull();

    manager.destroy();

    expect(removeDock).not.toHaveBeenCalled();
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
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }));

    expect(() => manager.render(createDefaultConfig())).not.toThrow();
    expect(() => manager.destroy()).not.toThrow();
  });

  it("renders canvas buttons into the editor toolbar host and cleans them up", () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle-util">
          <div class="block__icons"></div>
        </div>
      </div>
    `;

    const addTopBar = vi.fn(() => document.createElement("button"));
    const addStatusBar = vi.fn(() => document.createElement("div"));
    const addDock = vi.fn();
    const plugin = {
      addTopBar,
      addStatusBar,
      addDock,
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: {
        globalCommand: vi.fn(),
      },
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }));

    const config = createDefaultConfig();
    config.items[0].surface = "canvas";

    manager.render(config);

    const canvasButtons = document.querySelectorAll(".layout__center .protyle-util .block__icons .siyuan-power-buttons__button");
    expect(canvasButtons).toHaveLength(1);
    expect((canvasButtons[0] as HTMLElement).dataset.powerButtonsItemId).toBe(config.items[0].id);

    manager.destroy();

    expect(document.querySelector(".layout__center .protyle-util .block__icons .siyuan-power-buttons__button")).toBeNull();
  });
});
