import { describe, expect, it } from "vitest";
import {
  createButtonItem,
  createDefaultConfig,
  sanitizeConfig,
} from "@/core/config";

describe("config store model", () => {
  it("creates a desktop-only default config with starter buttons", () => {
    const config = createDefaultConfig();

    expect(config.version).toBe(1);
    expect(config.desktopOnly).toBe(true);
    expect(config.items.length).toBeGreaterThanOrEqual(3);
    expect(config.items.every(item => item.visible)).toBe(true);
    expect(config.items.map(item => item.title)).toEqual(["全局搜索", "插件设置", "大纲"]);
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

    expect(config.version).toBe(1);
    expect(config.desktopOnly).toBe(true);
    expect(config.items).toHaveLength(1);
    expect(config.items[0].surface).toBe("topbar");
    expect(config.items[0].actionType).toBe("builtin-global-command");
    expect(config.items[0].title.length).toBeGreaterThan(0);
  });
});
