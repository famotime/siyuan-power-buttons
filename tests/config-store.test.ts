import { describe, expect, it } from "vitest";
import {
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
