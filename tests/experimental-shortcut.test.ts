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
          recentDocs: {
            default: "⌘P",
          },
        },
      }),
      executeBuiltinCommand,
    });

    expect(result).toBe(true);
    expect(executeBuiltinCommand).toHaveBeenCalledWith("recentDocs");
  });

  it("falls back to keyboard dispatch when a builtin command match cannot be executed semantically", async () => {
    const dom = new JSDOM(`<div id="workspace"></div>`);
    const executeBuiltinCommand = vi.fn(() => false);
    const bodyHandler = vi.fn();
    dom.window.document.body.addEventListener("keydown", bodyHandler);

    const result = await executeExperimentalShortcut({
      actionId: "Alt+H",
      experimentalShortcut: {
        shortcut: "Alt+H",
        sendEscapeBefore: false,
        dispatchTarget: "body",
        allowDirectWindowDispatch: false,
      },
    }, {
      getKeymap: () => ({
        general: {
          dataHistory: {
            default: "⌥H",
          },
        },
      }),
      executeBuiltinCommand,
      document: dom.window.document,
      root: dom.window.document,
      bodyTarget: dom.window.document.body,
      windowTarget: dom.window,
    });

    expect(executeBuiltinCommand).toHaveBeenCalledWith("dataHistory");
    expect(result).toBe(true);
    expect(bodyHandler).toHaveBeenCalledTimes(1);
    expect(bodyHandler.mock.calls[0]?.[0]?.key).toBe("H");
  });

  it("keeps auto dispatch on window for builtin global shortcuts even when an editor is present", async () => {
    const dom = new JSDOM(`
      <div class="protyle">
        <div contenteditable="true" id="editor"></div>
      </div>
    `);
    const executeBuiltinCommand = vi.fn(() => false);
    const editor = dom.window.document.getElementById("editor") as HTMLElement;
    const windowHandler = vi.fn();
    const bodyHandler = vi.fn();
    const editorHandler = vi.fn();

    dom.window.addEventListener("keydown", windowHandler);
    editor.addEventListener("keydown", editorHandler);
    dom.window.document.body.addEventListener("keydown", bodyHandler);
    editor.focus();

    const result = await executeExperimentalShortcut({
      actionId: "Alt+H",
      experimentalShortcut: {
        shortcut: "Alt+H",
        sendEscapeBefore: false,
        dispatchTarget: "auto",
        allowDirectWindowDispatch: false,
      },
    }, {
      getKeymap: () => ({
        general: {
          dataHistory: {
            default: "⌥H",
          },
        },
      }),
      executeBuiltinCommand,
      document: dom.window.document,
      root: dom.window.document,
      bodyTarget: dom.window.document.body,
      windowTarget: dom.window,
    });

    expect(executeBuiltinCommand).toHaveBeenCalledWith("dataHistory");
    expect(result).toBe(true);
    expect(editorHandler).not.toHaveBeenCalled();
    expect(bodyHandler).not.toHaveBeenCalled();
    expect(windowHandler).toHaveBeenCalledTimes(1);
    expect(windowHandler.mock.calls[0]?.[0]?.key).toBe("H");
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
