import { describe, expect, it } from "vitest";
import {
  createClickSequenceStep,
  createExperimentalClickSequenceConfig,
  createExperimentalShortcutConfig,
  getClickSequenceFallbackSelector,
  getDefaultActionId,
  sanitizeExperimentalClickSequenceConfig,
  sanitizeExperimentalShortcutConfig,
} from "@/core/config/item-defaults";

describe("config item defaults", () => {
  it("returns stable action id defaults for supported action types", () => {
    expect(getDefaultActionId("builtin-global-command")).toBe("recentDocs");
    expect(getDefaultActionId("plugin-command")).toBe("siyuan-power-buttons:open-settings");
    expect(getDefaultActionId("experimental-shortcut")).toBe("");
    expect(getDefaultActionId("experimental-click-sequence")).toBe("text:设置");
  });

  it("derives click-sequence fallbacks from the action id", () => {
    expect(getClickSequenceFallbackSelector("barSettings")).toBe("barSettings");
    expect(getClickSequenceFallbackSelector("recentDocs")).toBe("text:设置");
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
          value: undefined,
          valueMode: "value",
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
      value: undefined,
      valueMode: "value",
      timeoutMs: 5000,
      retryCount: 2,
      retryDelayMs: 300,
      delayAfterMs: 200,
    });
  });

  it("builds reusable click-sequence configs with form-value defaults", () => {
    expect(createExperimentalClickSequenceConfig({
      steps: [
        {
          selector: "lang",
          value: "en_US",
        },
      ],
    }, "lang")).toEqual({
      steps: [
        {
          selector: "lang",
          value: "en_US",
          valueMode: "value",
          timeoutMs: 5000,
          retryCount: 2,
          retryDelayMs: 300,
          delayAfterMs: 200,
        },
      ],
      stopOnFailure: true,
    });
  });

  it("sanitizes experimental action configs with the same fallback rules used by settings and import", () => {
    expect(sanitizeExperimentalShortcutConfig({
      shortcut: "  Ctrl+B  ",
      sendEscapeBefore: true,
      dispatchTarget: "window",
      allowDirectWindowDispatch: true,
    }, "")).toEqual({
      shortcut: "Ctrl+B",
      sendEscapeBefore: true,
      dispatchTarget: "window",
      allowDirectWindowDispatch: true,
    });

    expect(sanitizeExperimentalClickSequenceConfig({
      steps: [
        {
          selector: "",
          timeoutMs: -1,
        },
      ],
      stopOnFailure: false,
    }, "barSettings")).toEqual({
      steps: [
        {
          selector: "barSettings",
          value: undefined,
          valueMode: "value",
          timeoutMs: 5000,
          retryCount: 2,
          retryDelayMs: 300,
          delayAfterMs: 200,
        },
      ],
      stopOnFailure: false,
    });
  });
});
