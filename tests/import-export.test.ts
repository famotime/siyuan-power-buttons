import { describe, expect, it } from "vitest";
import {
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

  it("round-trips experimental shortcut settings through import/export", () => {
    const config = importConfigFromJson(JSON.stringify({
      version: 2,
      desktopOnly: true,
      items: [
        {
          id: "exp-shortcut",
          title: "加粗",
          visible: true,
          iconType: "iconpark",
          iconValue: "iconpark:Edit",
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
    }));

    const serialized = exportConfigAsJson(config);
    const roundTripped = importConfigFromJson(serialized);

    expect(roundTripped).toEqual(config);
  });

  it("preserves empty experimental shortcut values when importing and exporting", () => {
    const config = importConfigFromJson(JSON.stringify({
      version: 2,
      desktopOnly: true,
      items: [
        {
          id: "exp-shortcut-empty",
          title: "待填写快捷键",
          visible: true,
          iconType: "iconpark",
          iconValue: "iconpark:Keyboard",
          surface: "topbar",
          order: 0,
          actionType: "experimental-shortcut",
          actionId: "",
          tooltip: "实验快捷键",
          experimentalShortcut: {
            shortcut: "",
            sendEscapeBefore: false,
            dispatchTarget: "auto",
            allowDirectWindowDispatch: false,
          },
        },
      ],
      experimental: {
        nativeToolbarControl: false,
        internalCommandAdapter: false,
        shortcutAdapter: true,
        clickSequenceAdapter: false,
      },
    }));

    const serialized = exportConfigAsJson(config);
    const roundTripped = importConfigFromJson(serialized);

    expect(roundTripped.items[0].actionId).toBe("");
    expect(roundTripped.items[0].experimentalShortcut?.shortcut).toBe("");
  });

  it("round-trips experimental click sequence settings through import/export", () => {
    const config = importConfigFromJson(JSON.stringify({
      version: 2,
      desktopOnly: true,
      items: [
        {
          id: "exp-sequence",
          title: "打开设置面板",
          visible: true,
          iconType: "iconpark",
          iconValue: "iconpark:Setting",
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
    }));

    const serialized = exportConfigAsJson(config);
    const roundTripped = importConfigFromJson(serialized);

    expect(roundTripped).toEqual(config);
  });
});
