/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { IMenuItem } from "siyuan";
import {
  cleanDividers,
  customizeSelectionToolbar,
  createDefaultDisabledSelectionToolbarItems,
  isNativeButtonDisabled,
  NATIVE_TOOLBAR_BUTTON_LABELS,
  CONFIGURABLE_NATIVE_NAMES,
} from "@/core/surfaces/selection-toolbar-manager";
import { sanitizeConfig } from "@/core/config/sanitize";
import { createDefaultConfig } from "@/core/config";
import { createButtonItem } from "@/core/config/defaults";
import { CommandExecutor } from "@/core/commands";

function createMockExecutor(): CommandExecutor {
  return new CommandExecutor({
    plugin: { globalCommand: vi.fn() },
    openUrl: vi.fn(),
    pluginCommands: new Map(),
  });
}

/** 桌面端默认浮动工具栏 */
const DEFAULT_DESKTOP_TOOLBAR: Array<string | IMenuItem> = [
  "block-ref", "a", "|",
  "text", "strong", "em", "u", "s", "mark", "sup", "sub", "clear",
  "|",
  "code", "kbd", "tag", "inline-math", "inline-memo",
];

describe("selection toolbar manager", () => {
  describe("NATIVE_TOOLBAR_BUTTON_LABELS", () => {
    it("covers all default desktop toolbar identifiers", () => {
      for (const item of DEFAULT_DESKTOP_TOOLBAR) {
        if (typeof item === "string" && item !== "|") {
          expect(NATIVE_TOOLBAR_BUTTON_LABELS[item]).toBeDefined();
        }
      }
    });

    it("has non-empty labels for every configurable native name", () => {
      for (const name of CONFIGURABLE_NATIVE_NAMES) {
        expect(NATIVE_TOOLBAR_BUTTON_LABELS[name]).toBeTruthy();
      }
    });
  });

  describe("cleanDividers", () => {
    it("returns empty array for empty input", () => {
      expect(cleanDividers([])).toEqual([]);
    });

    it("removes leading divider", () => {
      expect(cleanDividers(["|", "strong", "em"])).toEqual(["strong", "em"]);
    });

    it("removes trailing divider", () => {
      expect(cleanDividers(["strong", "em", "|"])).toEqual(["strong", "em"]);
    });

    it("merges consecutive dividers", () => {
      expect(cleanDividers(["strong", "|", "|", "em"])).toEqual(["strong", "|", "em"]);
    });

    it("handles all-dividers input", () => {
      expect(cleanDividers(["|", "|", "|"])).toEqual([]);
    });

    it("preserves valid divider positions", () => {
      const input: Array<string | IMenuItem> = [
        "block-ref", "a", "|", "strong", "em", "|", "code",
      ];
      expect(cleanDividers(input)).toEqual(input);
    });

    it("handles IMenuItem objects alongside strings", () => {
      const customItem: IMenuItem = { name: "custom", icon: "icon1", tip: "test" };
      const input: Array<string | IMenuItem> = [
        "|", "strong", "|", customItem, "|",
      ];
      expect(cleanDividers(input)).toEqual(["strong", "|", customItem]);
    });
  });

  describe("customizeSelectionToolbar", () => {
    it("returns original toolbar unchanged when no customizations", () => {
      const config = createDefaultConfig();
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);
      expect(result).toEqual(DEFAULT_DESKTOP_TOOLBAR);
    });

    it("removes disabled native buttons", () => {
      const config = createDefaultConfig();
      config.disabledSelectionToolbarItems = [
        { name: "mark", title: "高亮" },
        { name: "sup", title: "上标" },
        { name: "sub", title: "下标" },
      ];
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);

      const names = result.filter((item): item is string => typeof item === "string");
      expect(names).not.toContain("mark");
      expect(names).not.toContain("sup");
      expect(names).not.toContain("sub");
      // 其他按钮保留
      expect(names).toContain("strong");
      expect(names).toContain("em");
      expect(names).toContain("code");
    });

    it("cleans up dividers after removing buttons", () => {
      const config = createDefaultConfig();
      // 移除第二组分隔符两侧的所有按钮
      config.disabledSelectionToolbarItems = [
        { name: "code", title: "行内代码" },
        { name: "kbd", title: "键盘标记" },
        { name: "tag", title: "标签" },
        { name: "inline-math", title: "行内公式" },
        { name: "inline-memo", title: "行内备注" },
      ];
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);

      // 不应有连续分隔符或首尾分隔符
      for (let i = 0; i < result.length; i++) {
        if (typeof result[i] === "string" && result[i] === "|") {
          expect(i).toBeGreaterThan(0);
          expect(i).toBeLessThan(result.length - 1);
          expect(typeof result[i - 1] !== "string" || result[i - 1] !== "|").toBe(true);
        }
      }
    });

    it("appends custom buttons at the end with a divider separator", () => {
      const config = createDefaultConfig();
      config.items = [
        createButtonItem({
          id: "custom-1",
          title: "自定义按钮",
          surface: "selection-toolbar",
          order: 0,
          iconType: "iconpark",
          iconValue: "iconpark:Star",
        }),
      ];
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);

      // 最后一个元素应该是自定义按钮（IMenuItem）
      const lastItem = result[result.length - 1];
      expect(typeof lastItem).toBe("object");
      expect((lastItem as IMenuItem).name).toBe("power-buttons:custom-1");

      // 倒数第二个应该是分隔符
      const secondLast = result[result.length - 2];
      expect(secondLast).toBe("|");
    });

    it("does not add separator when custom buttons are appended to empty toolbar", () => {
      const config = createDefaultConfig();
      config.items = [
        createButtonItem({
          id: "custom-1",
          title: "唯一按钮",
          surface: "selection-toolbar",
          order: 0,
        }),
      ];
      config.disabledSelectionToolbarItems = CONFIGURABLE_NATIVE_NAMES.map(name => ({
        name,
        title: NATIVE_TOOLBAR_BUTTON_LABELS[name],
      }));
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);

      expect(result).toHaveLength(1);
      expect((result[0] as IMenuItem).name).toBe("power-buttons:custom-1");
    });

    it("sorts custom buttons by order", () => {
      const config = createDefaultConfig();
      config.items = [
        createButtonItem({
          id: "custom-b",
          title: "B按钮",
          surface: "selection-toolbar",
          order: 2,
        }),
        createButtonItem({
          id: "custom-a",
          title: "A按钮",
          surface: "selection-toolbar",
          order: 1,
        }),
      ];
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);

      const customItems = result.slice(-2) as IMenuItem[];
      expect(customItems[0].name).toBe("power-buttons:custom-a");
      expect(customItems[1].name).toBe("power-buttons:custom-b");
    });

    it("ignores invisible selection-toolbar items", () => {
      const config = createDefaultConfig();
      config.items = [
        createButtonItem({
          id: "visible-btn",
          title: "可见",
          surface: "selection-toolbar",
          visible: true,
          order: 0,
        }),
        createButtonItem({
          id: "hidden-btn",
          title: "隐藏",
          surface: "selection-toolbar",
          visible: false,
          order: 1,
        }),
      ];
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);

      const customNames = result
        .filter((item): item is IMenuItem => typeof item === "object")
        .map(item => item.name);
      expect(customNames).toContain("power-buttons:visible-btn");
      expect(customNames).not.toContain("power-buttons:hidden-btn");
    });

    it("ignores items on other surfaces", () => {
      const config = createDefaultConfig();
      config.items = [
        createButtonItem({
          id: "topbar-btn",
          title: "顶栏按钮",
          surface: "topbar",
          order: 0,
        }),
      ];
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);

      expect(result).toEqual(DEFAULT_DESKTOP_TOOLBAR);
    });

    it("custom button click callback invokes executor", () => {
      const config = createDefaultConfig();
      const item = createButtonItem({
        id: "clickable",
        title: "可点击",
        surface: "selection-toolbar",
        order: 0,
      });
      config.items = [item];
      const executor = createMockExecutor();
      const executeSpy = vi.spyOn(executor, "execute").mockResolvedValue(undefined);

      const result = customizeSelectionToolbar([...DEFAULT_DESKTOP_TOOLBAR], config, executor);
      const menuItem = result[result.length - 1] as IMenuItem;
      menuItem.click?.({} as never);

      expect(executeSpy).toHaveBeenCalledWith(item);
    });

    it("handles mobile toolbar (reduced set) correctly", () => {
      const mobileToolbar: Array<string | IMenuItem> = [
        "block-ref", "a", "|",
        "text", "strong", "em", "u", "clear",
        "|",
        "code", "tag", "inline-math", "inline-memo",
      ];

      const config = createDefaultConfig();
      config.disabledSelectionToolbarItems = [
        { name: "tag", title: "标签" },
      ];
      const executor = createMockExecutor();
      const result = customizeSelectionToolbar(mobileToolbar, config, executor);

      const names = result.filter((item): item is string => typeof item === "string");
      expect(names).not.toContain("tag");
      expect(names).toContain("code");
      expect(names).toContain("inline-math");
    });
  });

  describe("createDefaultDisabledSelectionToolbarItems", () => {
    it("returns empty array", () => {
      expect(createDefaultDisabledSelectionToolbarItems()).toEqual([]);
    });
  });

  describe("isNativeButtonDisabled", () => {
    it("returns true for disabled button", () => {
      const disabled = [{ name: "mark", title: "高亮" }];
      expect(isNativeButtonDisabled("mark", disabled)).toBe(true);
    });

    it("returns false for enabled button", () => {
      const disabled = [{ name: "mark", title: "高亮" }];
      expect(isNativeButtonDisabled("strong", disabled)).toBe(false);
    });

    it("returns false for empty disabled list", () => {
      expect(isNativeButtonDisabled("strong", [])).toBe(false);
    });
  });
});

describe("config sanitization for selection toolbar", () => {
  it("adds missing disabledSelectionToolbarItems on import", () => {
    const raw = {
      version: 2,
      desktopOnly: true,
      items: [],
      disabledNativeButtons: [],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: true,
        clickSequenceAdapter: true,
      },
    };
    const result = sanitizeConfig(raw);
    expect(result.disabledSelectionToolbarItems).toEqual([]);
  });

  it("preserves valid disabledSelectionToolbarItems", () => {
    const raw = {
      version: 2,
      desktopOnly: true,
      items: [],
      disabledNativeButtons: [],
      disabledSelectionToolbarItems: [
        { name: "mark", title: "高亮" },
        { name: "sup", title: "上标" },
      ],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: true,
        clickSequenceAdapter: true,
      },
    };
    const result = sanitizeConfig(raw);
    expect(result.disabledSelectionToolbarItems).toEqual([
      { name: "mark", title: "高亮" },
      { name: "sup", title: "上标" },
    ]);
  });

  it("filters out invalid native button names", () => {
    const raw = {
      version: 2,
      desktopOnly: true,
      items: [],
      disabledNativeButtons: [],
      disabledSelectionToolbarItems: [
        { name: "mark", title: "高亮" },
        { name: "invalid-button", title: "无效" },
        { name: "", title: "空名" },
      ],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: true,
        clickSequenceAdapter: true,
      },
    };
    const result = sanitizeConfig(raw);
    expect(result.disabledSelectionToolbarItems).toEqual([
      { name: "mark", title: "高亮" },
    ]);
  });

  it("uses name as fallback title when title is empty", () => {
    const raw = {
      version: 2,
      desktopOnly: true,
      items: [],
      disabledNativeButtons: [],
      disabledSelectionToolbarItems: [
        { name: "strong", title: "" },
      ],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: true,
        clickSequenceAdapter: true,
      },
    };
    const result = sanitizeConfig(raw);
    expect(result.disabledSelectionToolbarItems).toEqual([
      { name: "strong", title: "strong" },
    ]);
  });
});
