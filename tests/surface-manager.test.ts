/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { createDefaultConfig } from "@/core/config";
import { CommandExecutor } from "@/core/commands";
import { SurfaceManager } from "@/core/surfaces";
import * as commands from "@/core/commands";

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

  it("renders canvas buttons before the readonly breadcrumb anchor and cleans them up", () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar">
            <button data-type="exit-focus" class="protyle-breadcrumb__icon" type="button">退出聚焦</button>
            <button data-type="readonly" class="protyle-breadcrumb__icon" type="button">只读</button>
          </div>
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

    const toolbar = document.querySelector(".layout__center .protyle-breadcrumb__bar") as HTMLElement;
    const readonlyButton = toolbar.querySelector('[data-type="readonly"]') as HTMLElement;
    const insertedButton = toolbar.querySelector(".siyuan-power-buttons__button") as HTMLElement;

    expect(insertedButton).not.toBeNull();
    expect(insertedButton.dataset.powerButtonsItemId).toBe(config.items[0].id);
    expect(insertedButton.nextElementSibling).toBe(readonlyButton);

    manager.destroy();

    expect(toolbar.querySelector(".siyuan-power-buttons__button")).toBeNull();
    expect(toolbar.querySelector('[data-type="readonly"]')).toBe(readonlyButton);
  });

  it("suppresses configured native buttons by hiding them and intercepting click events", () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar">
            <button id="native-canvas-pin" data-type="readonly" class="protyle-breadcrumb__icon" type="button">只读</button>
          </div>
        </div>
      </div>
    `;

    const nativeButton = document.querySelector("#native-canvas-pin") as HTMLButtonElement;
    const nativeClick = vi.fn();
    nativeButton.addEventListener("click", nativeClick);

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
    config.disabledNativeButtons = [
      {
        id: "native:canvas:readonly",
        title: "只读",
        surface: "canvas",
        selectors: ["#native-canvas-pin", "[data-type='readonly']"],
      },
    ];

    manager.render(config);

    expect(nativeButton.hidden).toBe(true);
    expect(nativeButton.style.pointerEvents).toBe("none");

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    nativeButton.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(nativeClick).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("does not suppress matching buttons inside the settings preview UI", () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar">
            <button id="native-canvas-pin" data-type="readonly" class="protyle-breadcrumb__icon" type="button">只读</button>
          </div>
        </div>
      </div>
      <div class="power-buttons-settings">
        <div class="workspace-preview__disabled-items">
          <button class="workspace-chip" type="button">只读</button>
        </div>
      </div>
    `;

    const nativeButton = document.querySelector("#native-canvas-pin") as HTMLButtonElement;
    const settingsPreviewButton = document.querySelector(".power-buttons-settings .workspace-chip") as HTMLButtonElement;

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
    config.disabledNativeButtons = [
      {
        id: "native:canvas:readonly",
        title: "只读",
        surface: "canvas",
        selectors: ["text:只读"],
      },
    ];

    manager.render(config);

    expect(nativeButton.hidden).toBe(true);
    expect(settingsPreviewButton.hidden).toBe(false);
    expect(settingsPreviewButton.style.display).not.toBe("none");

    manager.destroy();
  });

  it("does not rescan editor subtree mutations when the disabled rule only targets topbar", async () => {
    document.body.innerHTML = `
      <div id="toolbar">
        <button id="native-toolbar-search" class="toolbar__item" type="button">搜索</button>
      </div>
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar"></div>
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
    config.disabledNativeButtons = [
      {
        id: "native:topbar:search",
        title: "搜索",
        surface: "topbar",
        selectors: ["#native-toolbar-search"],
      },
    ];

    const findSpy = vi.spyOn(commands, "findElementsBySmartSelector");
    manager.render(config);
    findSpy.mockClear();

    const insertedEditorButton = document.createElement("button");
    insertedEditorButton.id = "editor-search";
    insertedEditorButton.textContent = "搜索";
    insertedEditorButton.className = "protyle-breadcrumb__icon";
    document.querySelector(".protyle-breadcrumb__bar")?.appendChild(insertedEditorButton);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(insertedEditorButton.hidden).toBe(false);
    expect(findSpy).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("batches multiple mutations in the same frame into one suppression rescan", async () => {
    document.body.innerHTML = `
      <div id="toolbar">
        <button id="native-toolbar-search" class="toolbar__item" type="button">搜索</button>
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
    config.disabledNativeButtons = [
      {
        id: "native:topbar:search",
        title: "搜索",
        surface: "topbar",
        selectors: ["#native-toolbar-search"],
      },
    ];

    const findSpy = vi.spyOn(commands, "findElementsBySmartSelector");
    manager.render(config);
    findSpy.mockClear();

    const toolbar = document.querySelector("#toolbar") as HTMLElement;
    toolbar.appendChild(document.createElement("div"));
    toolbar.appendChild(document.createElement("div"));
    toolbar.appendChild(document.createElement("div"));

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(findSpy).toHaveBeenCalledTimes(1);

    manager.destroy();
  });

  it("stops after the first matching stable selector instead of falling through to text selectors", () => {
    document.body.innerHTML = `
      <div id="toolbar">
        <button id="native-toolbar-search" class="toolbar__item" type="button">搜索</button>
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
    config.disabledNativeButtons = [
      {
        id: "native:topbar:search",
        title: "搜索",
        surface: "topbar",
        selectors: ["text:搜索", "#native-toolbar-search", "[data-type='search']"],
      },
    ];

    const findSpy = vi.spyOn(commands, "findElementsBySmartSelector");
    manager.render(config);

    expect(findSpy.mock.calls.map(call => call[0])).toEqual([
      "#native-toolbar-search",
      "#native-toolbar-search",
    ]);

    manager.destroy();
  });
});
