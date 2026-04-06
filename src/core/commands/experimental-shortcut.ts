import type {
  ExperimentalShortcutConfig,
  PowerButtonItem,
} from "@/shared/types";
import { normalizeShortcutToSiyuanHotkey } from "@/shared/shortcut-utils";

type KeymapItem = {
  custom?: string;
  default?: string;
};

type KeymapGroup = Record<string, KeymapItem | undefined>;

type SiyuanKeymap = {
  general?: KeymapGroup;
  plugin?: KeymapGroup;
  editor?: {
    general?: KeymapGroup;
    insert?: KeymapGroup;
    heading?: KeymapGroup;
    list?: KeymapGroup;
    table?: KeymapGroup;
  };
};

type ShortcutMatch = {
  commandId: string;
  hotkey: string;
  kind: "builtin-global-command" | "plugin-command" | "editor-command";
  isEditorCommand: boolean;
};

function defaultExperimentalShortcut(actionId: string, input?: ExperimentalShortcutConfig): ExperimentalShortcutConfig {
  return {
    shortcut: input?.shortcut || actionId,
    sendEscapeBefore: input?.sendEscapeBefore ?? false,
    dispatchTarget: input?.dispatchTarget || "auto",
    allowDirectWindowDispatch: input?.allowDirectWindowDispatch ?? false,
  };
}

function findCommandInGroup(group: KeymapGroup | undefined, hotkey: string): { commandId: string; hotkey: string } | null {
  if (!group) {
    return null;
  }

  for (const [commandId, keymapItem] of Object.entries(group)) {
    if (!keymapItem) {
      continue;
    }
    const candidate = keymapItem.custom || keymapItem.default;
    if (candidate === hotkey) {
      return { commandId, hotkey: candidate };
    }
  }

  return null;
}

function resolveShortcutCommand(keymap: SiyuanKeymap | undefined, hotkey: string): ShortcutMatch | null {
  if (!keymap) {
    return null;
  }

  const builtin = findCommandInGroup(keymap.general, hotkey);
  if (builtin) {
    return {
      commandId: builtin.commandId,
      hotkey: builtin.hotkey,
      kind: "builtin-global-command",
      isEditorCommand: false,
    };
  }

  for (const group of [
    keymap.editor?.general,
    keymap.editor?.insert,
    keymap.editor?.heading,
    keymap.editor?.list,
    keymap.editor?.table,
  ]) {
    const editor = findCommandInGroup(group, hotkey);
    if (editor) {
      return {
        commandId: editor.commandId,
        hotkey: editor.hotkey,
        kind: "editor-command",
        isEditorCommand: true,
      };
    }
  }

  const plugin = findCommandInGroup(keymap.plugin, hotkey);
  if (plugin) {
    return {
      commandId: plugin.commandId,
      hotkey: plugin.hotkey,
      kind: "plugin-command",
      isEditorCommand: false,
    };
  }

  return null;
}

function parseHotkeyToKeyboardEvent(hotkey: string): KeyboardEventInit | null {
  const event: KeyboardEventInit = {
    key: "",
    code: "",
    ctrlKey: hotkey.includes("⌘") || hotkey.includes("⌃"),
    shiftKey: hotkey.includes("⇧"),
    altKey: hotkey.includes("⌥"),
    metaKey: false,
    bubbles: true,
    cancelable: true,
  };

  const mainKey = hotkey.replace(/[⌘⌃⇧⌥]/g, "").trim();
  if (!mainKey) {
    return null;
  }

  const keyCodeMap: Record<string, number> = {
    Enter: 13,
    Escape: 27,
    Backspace: 8,
    Tab: 9,
    Delete: 46,
    Space: 32,
    Home: 36,
    End: 35,
    ArrowUp: 38,
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
  };

  if (/^F\d{1,2}$/.test(mainKey)) {
    const number = Number(mainKey.slice(1));
    const keyCode = 111 + number;
    return {
      ...event,
      key: mainKey,
      code: mainKey,
      keyCode,
      which: keyCode,
    };
  }

  if (mainKey.length === 1) {
    const key = mainKey.toUpperCase();
    const isDigit = /^\d$/.test(mainKey);
    const keyCode = isDigit
      ? key.charCodeAt(0)
      : key.toUpperCase().charCodeAt(0);
    return {
      ...event,
      key,
      code: isDigit ? `Digit${key}` : `Key${key}`,
      keyCode,
      which: keyCode,
    };
  }

  if (keyCodeMap[mainKey]) {
    return {
      ...event,
      key: mainKey === "Space" ? " " : mainKey,
      code: mainKey,
      keyCode: keyCodeMap[mainKey],
      which: keyCodeMap[mainKey],
    };
  }

  return null;
}

function getActiveEditableElement(root: ParentNode, ownerDocument: Document): HTMLElement | null {
  const activeElement = ownerDocument.activeElement as HTMLElement | null;
  if (activeElement?.matches?.("[contenteditable='true']")) {
    return activeElement;
  }

  const activeProtyle = activeElement?.closest?.(".protyle");
  const activeEditable = activeProtyle?.querySelector?.("[contenteditable='true']") as HTMLElement | null;
  if (activeEditable) {
    return activeEditable;
  }

  return root.querySelector(".protyle:not(.fn__none):not(.fn__hidden) [contenteditable='true']") as HTMLElement | null
    || root.querySelector("[contenteditable='true']") as HTMLElement | null;
}

function dispatchKeyboardEvent(target: EventTarget, hotkey: string, view: Window): boolean {
  const eventInit = parseHotkeyToKeyboardEvent(hotkey);
  if (!eventInit) {
    return false;
  }
  target.dispatchEvent(new view.KeyboardEvent("keydown", eventInit));
  return true;
}

export async function executeExperimentalShortcut(
  item: Pick<PowerButtonItem, "actionId" | "experimentalShortcut">,
  options: {
    getKeymap?: () => SiyuanKeymap | undefined;
    executeBuiltinCommand?: (commandId: string) => boolean | Promise<boolean>;
    executePluginCommand?: (commandId: string) => boolean | Promise<boolean>;
    document?: Document;
    root?: ParentNode;
    windowTarget?: Window;
    bodyTarget?: HTMLElement;
  } = {},
): Promise<boolean> {
  const shortcutConfig = defaultExperimentalShortcut(item.actionId, item.experimentalShortcut);
  const normalizedHotkey = normalizeShortcutToSiyuanHotkey(shortcutConfig.shortcut);
  if (!normalizedHotkey) {
    return false;
  }

  const keymap = options.getKeymap?.();
  const shortcutMatch = resolveShortcutCommand(keymap, normalizedHotkey);
  if (shortcutMatch?.kind === "builtin-global-command" && options.executeBuiltinCommand && !shortcutMatch.isEditorCommand) {
    return Boolean(await options.executeBuiltinCommand(shortcutMatch.commandId));
  }
  if (shortcutMatch?.kind === "plugin-command" && options.executePluginCommand) {
    return Boolean(await options.executePluginCommand(shortcutMatch.commandId));
  }

  const effectiveHotkey = shortcutMatch?.hotkey || normalizedHotkey;
  const ownerDocument = options.document || document;
  const root = options.root || ownerDocument;
  const bodyTarget = options.bodyTarget || ownerDocument.body;
  const windowTarget = options.windowTarget || window;
  const editable = getActiveEditableElement(root, ownerDocument);
  const shouldTargetEditor = shortcutConfig.dispatchTarget === "active-editor"
    || (shortcutConfig.dispatchTarget === "auto" && (shortcutMatch?.isEditorCommand || Boolean(editable)));

  if (shouldTargetEditor && editable) {
    editable.focus?.();
    if (shortcutConfig.sendEscapeBefore) {
      dispatchKeyboardEvent(windowTarget, "Escape", windowTarget);
    }
    return dispatchKeyboardEvent(editable, effectiveHotkey, windowTarget);
  }

  if (shortcutConfig.dispatchTarget === "window" || (shortcutConfig.dispatchTarget === "auto" && shortcutConfig.allowDirectWindowDispatch)) {
    if (shortcutConfig.sendEscapeBefore) {
      dispatchKeyboardEvent(windowTarget, "Escape", windowTarget);
    }
    return dispatchKeyboardEvent(windowTarget, effectiveHotkey, windowTarget);
  }

  if (shortcutConfig.dispatchTarget === "body" || shortcutConfig.dispatchTarget === "auto") {
    if (shortcutConfig.sendEscapeBefore) {
      dispatchKeyboardEvent(windowTarget, "Escape", windowTarget);
    }
    return dispatchKeyboardEvent(bodyTarget, effectiveHotkey, windowTarget);
  }

  return false;
}

export { normalizeShortcutToSiyuanHotkey };
