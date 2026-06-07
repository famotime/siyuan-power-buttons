import { computed, ref } from "vue";
import {
  captureShortcutFromKeyboardEvent,
  findExperimentalShortcutConflict,
} from "@/shared/shortcut-utils";
import {
  createDefaultClickSequenceStep,
  ensureExperimentalClickSequenceConfig,
  ensureExperimentalShortcutConfig,
  summarizeClickSequence,
} from "@/features/settings/action-config";
import type { PowerButtonItem, PowerButtonsConfig } from "@/shared/types";

export interface UseSettingsShortcutsOptions {
  config: PowerButtonsConfig;
  selectedItem: () => PowerButtonItem | undefined;
  onPersist: () => Promise<void>;
  onNotify: (message: string, type?: string) => void;
}

export function useSettingsShortcuts(options: UseSettingsShortcutsOptions) {
  const { config, selectedItem, onPersist, onNotify } = options;

  const shortcutCaptureError = ref("");

  const selectedShortcutConflictMessage = computed(() => {
    const item = selectedItem();
    if (!item || item.actionType !== "experimental-shortcut") {
      return "";
    }

    const shortcut = item.experimentalShortcut?.shortcut?.trim()
      || item.actionId.trim();
    if (!shortcut) {
      return "";
    }

    const conflict = findExperimentalShortcutConflict(config.items, item.id, shortcut);
    if (!conflict) {
      return "";
    }

    return `快捷键 ${shortcut} 已被按钮「${conflict.title || "未命名按钮"}」使用`;
  });

  const activeShortcutMessage = computed(() => shortcutCaptureError.value || selectedShortcutConflictMessage.value);

  async function captureSelectedShortcut(event: KeyboardEvent): Promise<void> {
    const item = selectedItem();
    if (!item || item.actionType !== "experimental-shortcut") {
      return;
    }

    const capture = captureShortcutFromKeyboardEvent(event);
    if (capture.kind === "ignore") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const shortcutConfig = ensureExperimentalShortcutConfig(item);
    shortcutCaptureError.value = "";

    if (capture.kind === "clear") {
      shortcutConfig.shortcut = "";
      item.actionId = "";
      await onPersist();
      return;
    }

    const conflict = findExperimentalShortcutConflict(config.items, item.id, capture.shortcut);
    if (conflict) {
      const message = `快捷键 ${capture.shortcut} 已被按钮「${conflict.title || "未命名按钮"}」使用`;
      shortcutCaptureError.value = message;
      onNotify(`${message}。`, "error");
      return;
    }

    shortcutConfig.shortcut = capture.shortcut;
    item.actionId = capture.shortcut;
    await onPersist();
  }

  async function syncExperimentalShortcut(): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    const shortcutConfig = ensureExperimentalShortcutConfig(item);
    item.actionId = shortcutConfig.shortcut.trim();
    await onPersist();
  }

  async function toggleSelectedShortcutOption(key: "sendEscapeBefore" | "allowDirectWindowDispatch"): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    const shortcutConfig = ensureExperimentalShortcutConfig(item);
    shortcutConfig[key] = !shortcutConfig[key];
    item.actionId = shortcutConfig.shortcut.trim();
    await onPersist();
  }

  async function syncExperimentalClickSequence(): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(item);
    item.actionId = summarizeClickSequence(clickSequence);
    await onPersist();
  }

  async function addClickSequenceStep(): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(item);
    clickSequence.steps.push(createDefaultClickSequenceStep());
    item.actionId = summarizeClickSequence(clickSequence);
    await onPersist();
  }

  async function removeClickSequenceStep(index: number): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(item);
    if (clickSequence.steps.length <= 1) {
      return;
    }
    clickSequence.steps.splice(index, 1);
    item.actionId = summarizeClickSequence(clickSequence);
    await onPersist();
  }

  async function toggleSelectedClickSequenceStopOnFailure(): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(item);
    clickSequence.stopOnFailure = !clickSequence.stopOnFailure;
    item.actionId = summarizeClickSequence(clickSequence);
    await onPersist();
  }

  return {
    shortcutCaptureError,
    activeShortcutMessage,
    captureSelectedShortcut,
    syncExperimentalShortcut,
    toggleSelectedShortcutOption,
    syncExperimentalClickSequence,
    addClickSequenceStep,
    removeClickSequenceStep,
    toggleSelectedClickSequenceStopOnFailure,
  };
}
