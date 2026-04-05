import { describe, expect, it } from "vitest";
import {
  createButtonItem,
  createDefaultConfig,
  sanitizeConfig,
} from "@/core/config";
import { CONFIGURABLE_SURFACES } from "@/shared/types";

describe("config store model", () => {
  it("creates a desktop-only default config with starter buttons and disabled experimental adapters", () => {
    const config = createDefaultConfig();

    expect(config.version).toBe(2);
    expect(config.desktopOnly).toBe(true);
    expect(config.items.length).toBeGreaterThanOrEqual(3);
    expect(config.items.every(item => item.visible)).toBe(true);
    expect(config.items.map(item => item.title)).toEqual(["全局搜索", "插件设置", "大纲"]);
    expect(config.items.every(item => CONFIGURABLE_SURFACES.includes(item.surface))).toBe(true);
    expect(config.experimental.shortcutAdapter).toBe(false);
    expect(config.experimental.clickSequenceAdapter).toBe(false);
  });

  it("creates new buttons with a Chinese default title", () => {
    expect(createButtonItem().title).toBe("新建按钮");
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
    expect(config.experimental.shortcutAdapter).toBe(false);
    expect(config.experimental.clickSequenceAdapter).toBe(false);
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

  it("migrates the legacy open settings preset away from fileTree", () => {
    const config = sanitizeConfig({
      version: 1,
      desktopOnly: true,
      items: [
        createButtonItem({
          id: "legacy-open-settings",
          title: "Open Settings",
          tooltip: "Open Power Buttons settings",
          iconValue: "iconInfo",
          surface: "topbar",
          actionType: "builtin-global-command",
          actionId: "fileTree",
        }),
      ],
      experimental: null,
    });

    expect(config.items[0].actionType).toBe("custom-action");
    expect(config.items[0].actionId).toBe("open-settings");
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
});
