import { describe, expect, it } from "vitest";
import {
  captureShortcutFromKeyboardEvent,
  findExperimentalShortcutConflict,
} from "@/shared/shortcut-utils";

describe("shortcut utils", () => {
  it("captures modifier combinations into a stable display format", () => {
    expect(captureShortcutFromKeyboardEvent({
      key: "b",
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      metaKey: false,
    })).toEqual({
      kind: "set",
      shortcut: "Ctrl+Shift+B",
    });

    expect(captureShortcutFromKeyboardEvent({
      key: "5",
      ctrlKey: false,
      shiftKey: false,
      altKey: true,
      metaKey: false,
    })).toEqual({
      kind: "set",
      shortcut: "Alt+5",
    });
  });

  it("ignores modifier-only presses and clears on bare delete keys", () => {
    expect(captureShortcutFromKeyboardEvent({
      key: "Shift",
      ctrlKey: false,
      shiftKey: true,
      altKey: false,
      metaKey: false,
    })).toEqual({ kind: "ignore" });

    expect(captureShortcutFromKeyboardEvent({
      key: "Backspace",
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    })).toEqual({ kind: "clear" });
  });

  it("finds conflicting experimental shortcuts after normalization", () => {
    const conflict = findExperimentalShortcutConflict([
      {
        id: "item-a",
        title: "按钮 A",
        actionType: "experimental-shortcut",
        actionId: "Ctrl+B",
        experimentalShortcut: {
          shortcut: "Ctrl+B",
        },
      },
      {
        id: "item-b",
        title: "按钮 B",
        actionType: "experimental-shortcut",
        actionId: "",
        experimentalShortcut: {
          shortcut: "",
        },
      },
    ], "item-b", "control + b");

    expect(conflict?.id).toBe("item-a");
  });
});
