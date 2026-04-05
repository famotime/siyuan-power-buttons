import { describe, expect, it, vi } from "vitest";
import {
  ConfigStore,
  createDefaultConfig,
  exportConfigAsJson,
  importConfigFromJson,
} from "@/core/config";

describe("config import and export", () => {
  it("exports formatted json that can be imported back", () => {
    const config = createDefaultConfig();

    const serialized = exportConfigAsJson(config);
    const imported = importConfigFromJson(serialized);

    expect(imported).toEqual(config);
  });

  it("rejects invalid json documents", () => {
    expect(() => importConfigFromJson("{ broken json")).toThrow(/JSON/);
  });

  it("persists migrated legacy settings when loading from storage", async () => {
    const saveData = vi.fn();
    const store = new ConfigStore({
      loadData: async () => ({
        version: 1,
        desktopOnly: true,
        items: [
          {
            id: "legacy-open-settings",
            title: "Open Settings",
            tooltip: "Open Power Buttons settings",
            visible: true,
            iconType: "builtin",
            iconValue: "iconInfo",
            surface: "topbar",
            order: 0,
            actionType: "builtin-global-command",
            actionId: "fileTree",
          },
        ],
        experimental: null,
      }),
      saveData,
    } as never);

    const config = await store.load();

    expect(config.items[0].actionType).toBe("custom-action");
    expect(config.items[0].actionId).toBe("open-settings");
    expect(saveData).toHaveBeenCalledTimes(1);
  });
});
