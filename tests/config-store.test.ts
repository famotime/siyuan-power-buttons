import { describe, expect, it } from "vitest";
import {
  ConfigStore,
  createButtonItem,
  createDefaultConfig,
  sanitizeConfig,
} from "@/core/config";
import { CONFIGURABLE_SURFACES } from "@/shared/types";

describe("config store model", () => {
  it("creates a desktop-only default config without a prebuilt settings button and keeps experimental adapters enabled", () => {
    const config = createDefaultConfig();

    expect(config.version).toBe(2);
    expect(config.desktopOnly).toBe(true);
    expect(config.items.length).toBe(2);
    expect(config.items.every(item => item.visible)).toBe(true);
    expect(config.items.map(item => item.title)).toEqual(["全局搜索", "大纲"]);
    expect(config.items.some(item => item.actionType === "plugin-command" && item.actionId === "open-settings")).toBe(false);
    expect(config.items.every(item => CONFIGURABLE_SURFACES.includes(item.surface))).toBe(true);
    expect(config.experimental.shortcutAdapter).toBe(true);
    expect(config.experimental.clickSequenceAdapter).toBe(true);
  });

  it("creates new buttons with a Chinese default title", () => {
    expect(createButtonItem().title).toBe("新建");
  });

  it("sanitizes malformed input into a safe config", () => {
    const config = sanitizeConfig({
      version: 999,
      desktopOnly: "yes",
      items: [
        {
          id: "",
          title: "",
          visible: "true",
          iconType: "broken",
          iconValue: "",
          surface: "broken-surface",
          order: "nan",
          actionType: "broken-action",
          actionId: "",
        },
      ],
      experimental: null,
    });

    expect(config.version).toBe(2);
    expect(config.desktopOnly).toBe(true);
    expect(config.items).toHaveLength(1);
    expect(config.items[0].surface).toBe("topbar");
    expect(config.items[0].actionType).toBe("builtin-global-command");
    expect(config.items[0].title.length).toBeGreaterThan(0);
    expect(config.experimental.shortcutAdapter).toBe(true);
    expect(config.experimental.clickSequenceAdapter).toBe(true);
  });

  it("migrates legacy dock surfaces into configurable statusbar surfaces", () => {
    const config = sanitizeConfig({
      version: 1,
      desktopOnly: true,
      items: [
        createButtonItem({
          id: "legacy-left",
          title: "旧左侧 Dock",
          surface: "dock-left-top",
        }),
        createButtonItem({
          id: "legacy-right",
          title: "旧右侧 Dock",
          surface: "dock-right-bottom",
        }),
        createButtonItem({
          id: "legacy-bottom",
          title: "旧底部 Dock",
          surface: "dock-bottom-left",
        }),
      ],
      experimental: null,
    });

    expect(config.items.map(item => item.surface)).toEqual([
      "statusbar-left",
      "statusbar-right",
      "statusbar-left",
    ]);
  });

  it("preserves experimental shortcut items and adapter flags", () => {
    const config = sanitizeConfig({
      version: 2,
      desktopOnly: true,
      items: [
        {
          id: "exp-shortcut",
          title: "加粗",
          visible: true,
          iconType: "builtin",
          iconValue: "iconBold",
          surface: "topbar",
          order: 0,
          actionType: "experimental-shortcut",
          actionId: "Ctrl+B",
          tooltip: "实验快捷键",
          experimentalShortcut: {
            shortcut: "Ctrl+B",
            sendEscapeBefore: true,
            dispatchTarget: "active-editor",
          },
        },
      ],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: true,
        clickSequenceAdapter: false,
      },
    });

    expect(config.version).toBe(2);
    expect(config.items[0].actionType).toBe("experimental-shortcut");
    expect(config.items[0].actionId).toBe("Ctrl+B");
    expect(config.items[0].experimentalShortcut).toEqual({
      shortcut: "Ctrl+B",
      sendEscapeBefore: true,
      dispatchTarget: "active-editor",
      allowDirectWindowDispatch: false,
    });
    expect(config.experimental.shortcutAdapter).toBe(true);
    expect(config.experimental.clickSequenceAdapter).toBe(false);
  });

  it("preserves experimental click sequence items and adapter flags", () => {
    const config = sanitizeConfig({
      version: 2,
      desktopOnly: true,
      items: [
        {
          id: "exp-sequence",
          title: "打开设置面板",
          visible: true,
          iconType: "builtin",
          iconValue: "iconSettings",
          surface: "topbar",
          order: 0,
          actionType: "experimental-click-sequence",
          actionId: "barSettings",
          tooltip: "实验点击序列",
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
              {
                selector: "text:设置",
                timeoutMs: 5000,
                retryCount: 2,
                retryDelayMs: 300,
                delayAfterMs: 200,
              },
            ],
          },
        },
      ],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: false,
        clickSequenceAdapter: true,
      },
    });

    expect(config.items[0].actionType).toBe("experimental-click-sequence");
    expect(config.items[0].experimentalClickSequence).toEqual({
      stopOnFailure: true,
      steps: [
        {
          selector: "barSettings",
          timeoutMs: 3000,
          retryCount: 1,
          retryDelayMs: 100,
          delayAfterMs: 50,
        },
        {
          selector: "text:设置",
          timeoutMs: 5000,
          retryCount: 2,
          retryDelayMs: 300,
          delayAfterMs: 200,
        },
      ],
    });
    expect(config.experimental.clickSequenceAdapter).toBe(true);
  });

  it("preserves valid external plugin command bindings and resets invalid ones", () => {
    const config = sanitizeConfig({
      version: 2,
      desktopOnly: true,
      items: [
        {
          id: "external-valid",
          title: "文档摘要",
          visible: true,
          iconType: "builtin",
          iconValue: "iconInfo",
          surface: "topbar",
          order: 0,
          actionType: "external-plugin-command",
          actionId: "siyuan-doc-assist:insert-doc-summary",
        },
        {
          id: "external-invalid",
          title: "坏绑定",
          visible: true,
          iconType: "builtin",
          iconValue: "iconInfo",
          surface: "topbar",
          order: 1,
          actionType: "external-plugin-command",
          actionId: "broken-format",
        },
      ],
      experimental: null,
    });

    expect(config.items[0].actionType).toBe("external-plugin-command");
    expect(config.items[0].actionId).toBe("siyuan-doc-assist:insert-doc-summary");
    expect(config.items[1].actionType).toBe("external-plugin-command");
    expect(config.items[1].actionId).toBe("__external__:__unset__");
  });

  it("returns isolated snapshots when replacing and resetting store state", async () => {
    const plugin = {
      loadData: async () => null,
      saveData: async () => undefined,
    } as never;
    const store = new ConfigStore(plugin);
    const notified: string[] = [];

    store.subscribe((config) => {
      notified.push(config.items[0]?.title || "");
      config.items[0].title = "listener mutation";
    });

    await store.replace(createDefaultConfig());
    const snapshot = store.snapshot();
    snapshot.items[0].title = "snapshot mutation";

    expect(store.getConfig().items[0].title).toBe("全局搜索");
    expect(notified).toEqual(["全局搜索"]);

    const resetSnapshot = await store.reset();
    resetSnapshot.items[0].title = "reset snapshot mutation";

    expect(store.getConfig().items[0].title).toBe("全局搜索");
  });

  it("preserves native suppression rules when sanitizing config", () => {
    const config = sanitizeConfig({
      version: 2,
      desktopOnly: true,
      items: [],
      disabledNativeButtons: [
        {
          id: "native:canvas:readonly",
          title: "只读",
          surface: "canvas",
          selectors: ["#toolbarReadonly", "[data-type='readonly']"],
          iconMarkup: "<svg viewBox='0 0 24 24'></svg>",
        },
        {
          id: "",
          title: "",
          surface: "broken-surface",
          selectors: [],
        },
      ],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: true,
        clickSequenceAdapter: true,
      },
    });

    expect(config.disabledNativeButtons).toEqual([
      {
        id: "native:canvas:readonly",
        title: "只读",
        surface: "canvas",
        selectors: ["#toolbarReadonly", "[data-type='readonly']"],
        iconMarkup: "<svg viewBox='0 0 24 24'></svg>",
      },
    ]);
  });
});
