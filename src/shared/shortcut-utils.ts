type ShortcutCaptureEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey">;

type ExperimentalShortcutConflictItem = {
  id: string;
  title: string;
  actionType: string;
  actionId: string;
  experimentalShortcut?: {
    shortcut?: string | null;
  } | null;
};

export type ShortcutCaptureResult =
  | { kind: "set"; shortcut: string }
  | { kind: "clear" }
  | { kind: "ignore" };

const MODIFIER_KEYS = new Set(["control", "ctrl", "shift", "alt", "meta", "os", "cmd", "command"]);
const SPECIAL_KEY_LABELS: Record<string, string> = {
  " ": "Space",
  spacebar: "Space",
  escape: "Escape",
  esc: "Escape",
  enter: "Enter",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
};

function normalizeCapturedMainKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return "";
  }

  const lower = trimmed.toLowerCase();
  if (MODIFIER_KEYS.has(lower)) {
    return "";
  }

  if (SPECIAL_KEY_LABELS[lower]) {
    return SPECIAL_KEY_LABELS[lower];
  }

  if (/^f\d{1,2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^[a-z]$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^\d$/.test(trimmed)) {
    return trimmed;
  }

  return "";
}

function supportsModifierlessCapture(mainKey: string): boolean {
  return /^F\d{1,2}$/.test(mainKey);
}

export function captureShortcutFromKeyboardEvent(event: ShortcutCaptureEvent): ShortcutCaptureResult {
  const hasModifiers = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
  const normalizedKey = normalizeCapturedMainKey(event.key);

  if (!hasModifiers && ["Backspace", "Delete"].includes(normalizedKey)) {
    return { kind: "clear" };
  }

  if (!normalizedKey) {
    return { kind: "ignore" };
  }

  if (!hasModifiers && !supportsModifierlessCapture(normalizedKey)) {
    return { kind: "ignore" };
  }

  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.metaKey) {
    parts.push("Cmd");
  }
  parts.push(normalizedKey);

  return {
    kind: "set",
    shortcut: parts.join("+"),
  };
}

export function normalizeShortcutToSiyuanHotkey(shortcut: string): string {
  const trimmed = shortcut.trim();
  if (!trimmed) {
    return "";
  }

  const tokens = trimmed.split("+").map(token => token.trim()).filter(Boolean);
  const modifiers = new Set<string>();
  const mainKeys: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (["ctrl", "control", "cmd", "command", "meta"].includes(lower)) {
      modifiers.add("⌘");
      continue;
    }
    if (lower === "shift") {
      modifiers.add("⇧");
      continue;
    }
    if (["alt", "option"].includes(lower)) {
      modifiers.add("⌥");
      continue;
    }
    if (lower === "physicalctrl") {
      modifiers.add("⌃");
      continue;
    }
    mainKeys.push(token.length === 1 ? token.toUpperCase() : token);
  }

  const sortedModifiers = ["⇧", "⌃", "⌥", "⌘"].filter(symbol => modifiers.has(symbol));
  return `${sortedModifiers.join("")}${mainKeys.join("")}`.trim();
}

function readExperimentalShortcutValue(item: ExperimentalShortcutConflictItem): string {
  return item.experimentalShortcut?.shortcut?.trim() || item.actionId.trim();
}

export function findExperimentalShortcutConflict(
  items: ExperimentalShortcutConflictItem[],
  currentItemId: string,
  candidateShortcut: string,
): ExperimentalShortcutConflictItem | null {
  const normalizedCandidate = normalizeShortcutToSiyuanHotkey(candidateShortcut);
  if (!normalizedCandidate) {
    return null;
  }

  return items.find(item => {
    if (item.id === currentItemId || item.actionType !== "experimental-shortcut") {
      return false;
    }
    return normalizeShortcutToSiyuanHotkey(readExperimentalShortcutValue(item)) === normalizedCandidate;
  }) || null;
}
