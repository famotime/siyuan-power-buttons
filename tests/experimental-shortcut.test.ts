import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { executeExperimentalShortcut, normalizeShortcutToSiyuanHotkey } from "@/core/commands";

describe("experimental shortcut adapter", () => {
  it("normalizes user shortcuts into Siyuan hotkey format", () => {
    expect(normalizeShortcutToSiyuanHotkey("Ctrl+B")).toBe("⌘B");
    expect(normalizeShortcutToSiyuanHotkey("Ctrl+Shift+P")).toBe("⇧⌘P");
    expect(normalizeShortcutToSiyuanHotkey("Alt+5")).toBe("⌥5");
  });

  it("falls back to stable builtin execution when the shortcut maps to a builtin command", async () => {
    const executeBuiltinCommand = vi.fn(() => true);

    const result = await executeExperimentalShortcut({
      actionId: "Ctrl+P",
      experimentalShortcut: {
        shortcut: "Ctrl+P",
        sendEscapeBefore: false,
        dispatchTarget: "auto",
        allowDirectWindowDispatch: false,
      },
    }, {
      getKeymap: () => ({
        general: {
          globalSearch: {
            default: "⌘P",
          },
        },
      }),
      executeBuiltinCommand,
    });

    expect(result).toBe(true);
    expect(executeBuiltinCommand).toHaveBeenCalledWith("globalSearch");
  });

  it("dispatches editor shortcuts to the active editable element when no stable builtin handler applies", async () => {
    const dom = new JSDOM(`
      <div class="protyle">
        <div contenteditable="true" id="editor"></div>
      </div>
    `);
    const editor = dom.window.document.getElementById("editor") as HTMLElement;
    const handler = vi.fn();
    editor.addEventListener("keydown", handler);
    editor.focus();

    const result = await executeExperimentalShortcut({
      actionId: "Ctrl+B",
      experimentalShortcut: {
        shortcut: "Ctrl+B",
        sendEscapeBefore: false,
        dispatchTarget: "active-editor",
        allowDirectWindowDispatch: false,
      },
    }, {
      getKeymap: () => ({
        editor: {
          general: {
            bold: {
              default: "⌘B",
            },
          },
        },
      }),
      document: dom.window.document,
      root: dom.window.document,
      bodyTarget: dom.window.document.body,
      windowTarget: dom.window,
    });

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
