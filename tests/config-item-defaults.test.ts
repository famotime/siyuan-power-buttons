import { describe, expect, it } from "vitest";
import {
  createClickSequenceStep,
  createExperimentalClickSequenceConfig,
  createExperimentalShortcutConfig,
  getClickSequenceFallbackSelector,
  getDefaultActionId,
} from "@/core/config/item-defaults";

describe("config item defaults", () => {
  it("returns stable action id defaults for supported action types", () => {
    expect(getDefaultActionId("builtin-global-command")).toBe("globalSearch");
    expect(getDefaultActionId("plugin-command")).toBe("open-settings");
    expect(getDefaultActionId("external-plugin-command")).toBe("__external__:__unset__");
    expect(getDefaultActionId("experimental-shortcut")).toBe("");
    expect(getDefaultActionId("experimental-click-sequence")).toBe("text:设置");
  });

  it("derives click-sequence fallbacks from the action id", () => {
    expect(getClickSequenceFallbackSelector("barSettings")).toBe("barSettings");
    expect(getClickSequenceFallbackSelector("globalSearch")).toBe("text:设置");
    expect(getClickSequenceFallbackSelector("")).toBe("text:设置");
  });

  it("builds reusable default shortcut and click-sequence configs", () => {
    expect(createExperimentalShortcutConfig()).toEqual({
      shortcut: "",
      sendEscapeBefore: false,
      dispatchTarget: "auto",
      allowDirectWindowDispatch: false,
    });

    expect(createExperimentalClickSequenceConfig({
      steps: [],
      stopOnFailure: false,
    }, "barSettings")).toEqual({
      steps: [
        {
          selector: "barSettings",
          timeoutMs: 5000,
          retryCount: 2,
          retryDelayMs: 300,
          delayAfterMs: 200,
        },
      ],
      stopOnFailure: false,
    });
  });

  it("normalizes individual click-sequence steps with fallback values", () => {
    expect(createClickSequenceStep({
      selector: "",
      timeoutMs: -1,
    }, "text:帮助")).toEqual({
      selector: "text:帮助",
      timeoutMs: 5000,
      retryCount: 2,
      retryDelayMs: 300,
      delayAfterMs: 200,
    });
  });
});
