/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { createDefaultConfig } from "@/core/config";
import { CommandExecutor } from "@/core/commands";
import { createButtonItem } from "@/core/config/defaults";
import { SurfaceManager, STANDALONE_DOCK_ICON_SYMBOL } from "@/core/surfaces";
import * as commands from "@/core/commands";
import * as dialogUtils from "@/core/surfaces/dialog-utils";
import { renderIconMarkup } from "@/shared/icon-renderer";

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

    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "topbar-docs",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
    ];

    manager.render(config);

    expect(addTopBar).toHaveBeenCalledTimes(2);
    expect(addTopBar.mock.calls[0][0]).toMatchObject({
      icon: renderIconMarkup({
        iconType: "iconpark",
        iconValue: "iconpark:AsteriskKey",
      }, document),
      title: "随心按",
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

    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "topbar-docs",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
      createButtonItem({
        id: "statusbar-note",
        title: "今日日记",
        surface: "statusbar-right",
        order: 1,
      }),
    ];

    manager.render(config);

    expect(addTopBar).toHaveBeenCalledTimes(2);
    expect(addStatusBar).toHaveBeenCalledTimes(1);
    expect(addDock).toHaveBeenCalledTimes(1);
    expect(addDock).toHaveBeenCalledWith(expect.objectContaining({
      type: "siyuan-power-buttons-dock-panel",
      config: expect.objectContaining({
        position: "RightTop",
        title: "随心按",
      }),
    }));

    const statusOptions = addStatusBar.mock.calls[0][0];
    const statusButton = statusOptions.element as HTMLButtonElement;
    expect(statusButton.querySelector(".siyuan-power-buttons__label")).toBeNull();

    manager.destroy();

    expect(removeDock).toHaveBeenCalledWith("siyuan-power-buttons-dock-panel");
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
    config.items = [
      createButtonItem({
        id: "canvas-docs",
        title: "最近文档",
        surface: "canvas",
        order: 0,
      }),
    ];

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
    config.items = [
      createButtonItem({
        id: "canvas-docs",
        title: "最近文档",
        surface: "canvas",
        order: 0,
      }),
    ];

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

  it("orders injected selection toolbar buttons according to the mixed toolbar layout", () => {
    document.body.innerHTML = `
      <div class="protyle-toolbar">
        <button data-type="strong" class="protyle-toolbar__item" type="button">粗体</button>
        <button data-type="em" class="protyle-toolbar__item" type="button">斜体</button>
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
    config.items = [
      createButtonItem({
        id: "custom-middle",
        title: "中间按钮",
        surface: "selection-toolbar",
        order: 0,
      }),
    ];
    config.selectionToolbarLayout = [
      { type: "native", id: "strong" },
      { type: "custom", id: "custom-middle" },
      { type: "native", id: "em" },
    ];

    manager.render(config);

    const toolbar = document.querySelector(".protyle-toolbar") as HTMLElement;
    expect(Array.from(toolbar.children).map(child => (child as HTMLElement).dataset.type)).toEqual([
      "strong",
      "power-buttons:custom-middle",
      "em",
    ]);

    manager.destroy();
  });

  it("does not keep moving selection toolbar nodes after the mixed layout is applied", async () => {
    document.body.innerHTML = `
      <div class="protyle-toolbar">
        <button data-type="strong" class="protyle-toolbar__item" type="button">粗体</button>
        <button data-type="power-buttons:custom-middle" data-power-buttons-item-id="custom-middle" class="protyle-toolbar__item" type="button">中间</button>
        <button data-type="em" class="protyle-toolbar__item" type="button">斜体</button>
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
    config.items = [
      createButtonItem({
        id: "custom-middle",
        title: "中间按钮",
        surface: "selection-toolbar",
        order: 0,
      }),
    ];
    config.selectionToolbarLayout = [
      { type: "native", id: "strong" },
      { type: "custom", id: "custom-middle" },
      { type: "native", id: "em" },
    ];

    const toolbar = document.querySelector(".protyle-toolbar") as HTMLElement;
    const appendSpy = vi.spyOn(toolbar, "appendChild");

    manager.render(config);
    const callsAfterInitialPatch = appendSpy.mock.calls.length;

    document.body.appendChild(document.createElement("div"));
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(appendSpy).toHaveBeenCalledTimes(callsAfterInitialPatch);

    manager.destroy();
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

  it("renders standalone dock panel with empty state when no buttons are placed on dock-panel", () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const addDock = vi.fn((options: any) => {
      dockInit = options.init;
      return {
        model: { remove: vi.fn() },
      };
    });
    const openSettings = vi.fn();
    const plugin = {
      addTopBar: vi.fn(() => document.createElement("button")),
      addStatusBar: vi.fn(() => document.createElement("div")),
      addDock,
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: { globalCommand: vi.fn() },
      openUrl: vi.fn(),
      pluginCommands: new Map([
        ["open-settings", openSettings],
      ]),
    }));

    const config = createDefaultConfig();
    config.items = [];
    manager.render(config);

    expect(addDock).toHaveBeenCalledWith(expect.objectContaining({
      type: "siyuan-power-buttons-dock-panel",
      config: expect.objectContaining({
        icon: STANDALONE_DOCK_ICON_SYMBOL,
      }),
    }));

    const host = document.createElement("div");
    dockInit?.({ element: host });

    // Empty state should be rendered
    const empty = host.querySelector(".siyuan-power-buttons__dock-empty");
    expect(empty).not.toBeNull();
    expect(host.querySelector(".siyuan-power-buttons__dock-empty-text")?.textContent).toBe("暂未放置快捷按钮");

    // Click "前往设置添加"
    const emptyBtn = host.querySelector<HTMLButtonElement>(".siyuan-power-buttons__dock-empty-btn");
    expect(emptyBtn).not.toBeNull();
    emptyBtn?.click();
    expect(openSettings).toHaveBeenCalledTimes(1);

    // Click header settings icon
    const settingsBtn = host.querySelector<HTMLElement>(".siyuan-power-buttons__dock-settings-btn");
    expect(settingsBtn).not.toBeNull();
    settingsBtn?.click();
    expect(openSettings).toHaveBeenCalledTimes(2);

    manager.destroy();
  });

  it("renders grid cards for dock-panel buttons and executes actions when clicked", () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const addDock = vi.fn((options: any) => {
      dockInit = options.init;
      return {
        model: { remove: vi.fn() },
      };
    });
    const runBuiltinCommand = vi.fn(() => true);
    const plugin = {
      addTopBar: vi.fn(() => document.createElement("button")),
      addStatusBar: vi.fn(() => document.createElement("div")),
      addDock,
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: { globalCommand: vi.fn() },
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      runBuiltinCommand,
    }));

    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "panel-daily-note",
        title: "每日日志",
        surface: "dock-panel",
        actionType: "builtin-global-command",
        actionId: "dailyNote",
        order: 0,
      }),
      createButtonItem({
        id: "panel-search",
        title: "全局搜索",
        surface: "dock-panel",
        actionType: "builtin-global-command",
        actionId: "search",
        order: 1,
      }),
    ];

    manager.render(config);

    const host = document.createElement("div");
    dockInit?.({ element: host });

    const grid = host.querySelector(".siyuan-power-buttons__dock-grid");
    expect(grid).not.toBeNull();

    const cards = host.querySelectorAll<HTMLButtonElement>(".siyuan-power-buttons__dock-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector(".siyuan-power-buttons__dock-card-title")?.textContent).toBe("每日日志");
    expect(cards[1].querySelector(".siyuan-power-buttons__dock-card-title")?.textContent).toBe("全局搜索");

    // Click first card
    cards[0].click();
    expect(runBuiltinCommand).toHaveBeenCalledWith("dailyNote");

    manager.destroy();
  });

  it("renders the same button on multiple surfaces when configured with multiple surfaces", () => {
    const addTopBar = vi.fn((opts: { title: string; callback?: () => void }) => {
      const el = document.createElement("div");
      el.title = opts.title;
      el.addEventListener("click", () => opts.callback?.());
      return el;
    });
    const addStatusBar = vi.fn((opts: { element: HTMLElement; position: string }) => {
      opts.element.dataset.position = opts.position;
      return opts.element;
    });
    const plugin = {
      addTopBar,
      addStatusBar,
      addDock: vi.fn(),
    } as never;

    const runBuiltinCommand = vi.fn();
    const executor = new CommandExecutor({
      plugin: {
        globalCommand: runBuiltinCommand,
      },
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    });

    const manager = new SurfaceManager(plugin, executor);
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "multi-surface-btn",
        title: "全能按钮",
        surfaces: ["topbar", "statusbar-right"],
        actionType: "builtin-global-command",
        actionId: "dailyNote",
        order: 0,
      }),
    ];

    manager.render(config);

    // 顶栏有1个固定设置按钮 + 1个自定义按钮
    expect(addTopBar).toHaveBeenCalledTimes(2);
    expect(addTopBar).toHaveBeenCalledWith(expect.objectContaining({
      title: "全能按钮",
    }));

    // 状态栏有1个按钮，且默认为右侧
    expect(addStatusBar).toHaveBeenCalledTimes(1);
    expect(addStatusBar).toHaveBeenCalledWith(expect.objectContaining({
      position: "right",
    }));

    manager.destroy();
  });

  it("renders standalone dock with dividers, highlighted settings button, and add-divider button", () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const plugin = {
      addTopBar: vi.fn(() => document.createElement("button")),
      addStatusBar: vi.fn(() => document.createElement("div")),
      addDock: vi.fn((opts: { init?: (dock: { element: HTMLElement }) => void }) => {
        dockInit = opts.init;
        return { model: { remove: vi.fn() } };
      }),
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: { globalCommand: vi.fn() },
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }));

    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "btn-note",
        title: "每日日志",
        surface: "dock-panel",
        order: 0,
      }),
    ];
    config.surfaceLayouts = {
      "dock-panel": [
        { type: "divider", id: "div-1", title: "核心功能" },
        { type: "button", id: "btn-note" },
        { type: "divider", id: "div-2" },
      ],
    };

    manager.render(config);

    const host = document.createElement("div");
    dockInit?.({ element: host });

    // 验证头部按钮
    const addDividerBtn = host.querySelector(".siyuan-power-buttons__dock-add-divider-btn");
    const settingsBtn = host.querySelector(".siyuan-power-buttons__dock-settings-btn");
    expect(addDividerBtn).not.toBeNull();
    expect(settingsBtn).not.toBeNull();

    // 验证分割线和卡片
    const dividers = host.querySelectorAll(".siyuan-power-buttons__dock-divider");
    expect(dividers).toHaveLength(2);
    expect(dividers[0].querySelector(".siyuan-power-buttons__dock-divider-title")?.textContent).toBe("核心功能");
    expect(dividers[1].classList.contains("is-line-only")).toBe(true);

    const cards = host.querySelectorAll(".siyuan-power-buttons__dock-card");
    expect(cards).toHaveLength(1);

    manager.destroy();
  });

  it("supports adding, editing, and deleting dividers via dock panel controls", async () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const plugin = {
      addTopBar: vi.fn(() => document.createElement("button")),
      addStatusBar: vi.fn(() => document.createElement("div")),
      addDock: vi.fn((opts: { init?: (dock: { element: HTMLElement }) => void }) => {
        dockInit = opts.init;
        return { model: { remove: vi.fn() } };
      }),
    } as never;

    const onSaveConfig = vi.fn();
    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: { globalCommand: vi.fn() },
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }), onSaveConfig);

    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "btn-note",
        title: "每日日志",
        surface: "dock-panel",
        order: 0,
      }),
    ];
    config.surfaceLayouts = {
      "dock-panel": [
        { type: "button", id: "btn-note" },
      ],
    };

    manager.render(config);

    const host = document.createElement("div");
    dockInit?.({ element: host });

    // 1. 测试添加分割线
    const promptSpy = vi.spyOn(dialogUtils, "promptDialog").mockResolvedValue("快捷分区");
    const addBtn = host.querySelector<HTMLSpanElement>(".siyuan-power-buttons__dock-add-divider-btn");
    await addBtn?.click();

    expect(promptSpy).toHaveBeenCalled();
    expect(onSaveConfig).toHaveBeenCalled();
    expect(config.surfaceLayouts["dock-panel"]).toHaveLength(2);
    expect(config.surfaceLayouts["dock-panel"]![1]).toMatchObject({
      type: "divider",
      title: "快捷分区",
    });

    // 2. 测试修改分割线名称
    promptSpy.mockResolvedValue("修改后的分区");
    const editBtn = host.querySelector<HTMLButtonElement>(".siyuan-power-buttons__dock-divider-edit");
    await editBtn?.click();

    expect(config.surfaceLayouts["dock-panel"]![1].title).toBe("修改后的分区");

    // 3. 测试删除分割线
    const confirmSpy = vi.spyOn(dialogUtils, "confirmDialog").mockResolvedValue(true);
    const delBtn = host.querySelector<HTMLButtonElement>(".siyuan-power-buttons__dock-divider-del");
    await delBtn?.click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(config.surfaceLayouts["dock-panel"]).toHaveLength(1);

    promptSpy.mockRestore();
    confirmSpy.mockRestore();
    manager.destroy();
  });

  it("supports drag and drop reordering in standalone dock panel", () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const plugin = {
      addTopBar: vi.fn(() => document.createElement("button")),
      addStatusBar: vi.fn(() => document.createElement("div")),
      addDock: vi.fn((opts: { init?: (dock: { element: HTMLElement }) => void }) => {
        dockInit = opts.init;
        return { model: { remove: vi.fn() } };
      }),
    } as never;

    const onSaveConfig = vi.fn();
    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: { globalCommand: vi.fn() },
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }), onSaveConfig);

    const config = createDefaultConfig();
    config.items = [
      createButtonItem({ id: "btn-1", title: "按钮 1", surface: "dock-panel" }),
      createButtonItem({ id: "btn-2", title: "按钮 2", surface: "dock-panel" }),
    ];
    config.surfaceLayouts = {
      "dock-panel": [
        { type: "button", id: "btn-1" },
        { type: "button", id: "btn-2" },
      ],
    };

    manager.render(config);

    const host = document.createElement("div");
    dockInit?.({ element: host });

    const cards = host.querySelectorAll<HTMLButtonElement>(".siyuan-power-buttons__dock-card");
    expect(cards).toHaveLength(2);

    // Simulate drop from index 1 onto index 0
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn().mockReturnValue("1"),
      },
    });
    cards[0].dispatchEvent(dropEvent);

    expect(onSaveConfig).toHaveBeenCalled();
    expect(config.surfaceLayouts["dock-panel"]!.map(e => e.id)).toEqual(["btn-2", "btn-1"]);

    manager.destroy();
  });

  it("renders surfaces strictly respecting their independent surfaceLayouts", () => {
    const topBarCalls: string[] = [];
    const statusBarCalls: string[] = [];

    const plugin = {
      addTopBar: vi.fn((opts: { title: string }) => {
        topBarCalls.push(opts.title);
        return document.createElement("button");
      }),
      addStatusBar: vi.fn((opts: { element: HTMLElement }) => {
        statusBarCalls.push(opts.element.title);
        return opts.element;
      }),
      addDock: vi.fn(),
    } as never;

    const manager = new SurfaceManager(plugin, new CommandExecutor({
      plugin: { globalCommand: vi.fn() },
      openUrl: vi.fn(),
      pluginCommands: new Map(),
    }));

    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "btn-1",
        title: "第一",
        surfaces: ["topbar", "statusbar-right"],
        order: 0,
      }),
      createButtonItem({
        id: "btn-2",
        title: "第二",
        surfaces: ["topbar", "statusbar-right"],
        order: 1,
      }),
    ];
    // In topbar: btn-1 first, then btn-2
    // In statusbar-right: btn-2 first, then btn-1 (independent!)
    config.surfaceLayouts = {
      topbar: [
        { type: "button", id: "btn-1" },
        { type: "button", id: "btn-2" },
      ],
      "statusbar-right": [
        { type: "button", id: "btn-2" },
        { type: "button", id: "btn-1" },
      ],
    };

    manager.render(config);

    // 顶栏调用（除去第一个固定随心按设置按钮）
    const customTopBar = topBarCalls.slice(1);
    expect(customTopBar).toEqual(["第一", "第二"]);

    // 状态栏调用：第二在前，第一在后
    expect(statusBarCalls).toEqual(["第二", "第一"]);

    manager.destroy();
  });
});
