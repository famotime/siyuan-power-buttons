import { isExternalCommandActionId } from "@/core/commands/external-command-types";
import {
  createButtonItem,
  createDefaultConfig,
} from "@/core/config/defaults";
import {
  createClickSequenceStep,
  createExperimentalClickSequenceConfig,
  createExperimentalShortcutConfig,
  DEFAULT_CLICK_SEQUENCE_SELECTOR,
  getDefaultActionId,
} from "@/core/config/item-defaults";
import {
  DEFAULT_BUILTIN_ICON,
} from "@/shared/constants";
import {
  SURFACES,
  ACTION_TYPES,
  CONFIGURABLE_SURFACES,
  ICON_TYPES,
} from "@/shared/types";
import {
  normalizeItemOrder,
  sortItems,
} from "@/shared/utils";
import type {
  ActionType,
  DisabledNativeButton,
  ClickSequenceStep,
  ExperimentalClickSequenceConfig,
  ExperimentalShortcutConfig,
  IconType,
  PowerButtonItem,
  PowerButtonsConfig,
  SurfaceType,
} from "@/shared/types";

const LEGACY_SURFACE_MIGRATIONS: Record<string, SurfaceType> = {
  "dock-bottom-left": "statusbar-left",
  "dock-bottom-right": "statusbar-right",
  "dock-left-bottom": "statusbar-left",
  "dock-left-top": "statusbar-left",
  "dock-right-bottom": "statusbar-right",
  "dock-right-top": "statusbar-right",
};

function ensureSurface(value: unknown): SurfaceType {
  if (CONFIGURABLE_SURFACES.includes(value as typeof CONFIGURABLE_SURFACES[number])) {
    return value as SurfaceType;
  }
  if (typeof value === "string" && LEGACY_SURFACE_MIGRATIONS[value]) {
    return LEGACY_SURFACE_MIGRATIONS[value];
  }
  return "topbar";
}

function ensureRuntimeSurface(value: unknown): SurfaceType {
  if (SURFACES.includes(value as SurfaceType)) {
    return value as SurfaceType;
  }
  if (typeof value === "string" && LEGACY_SURFACE_MIGRATIONS[value]) {
    return LEGACY_SURFACE_MIGRATIONS[value];
  }
  return "topbar";
}

function ensureActionType(value: unknown): ActionType {
  return ACTION_TYPES.includes(value as ActionType) ? value as ActionType : "builtin-global-command";
}

function ensureIconType(value: unknown): IconType {
  return ICON_TYPES.includes(value as IconType) ? value as IconType : "builtin";
}

function sanitizeExperimentalShortcut(raw: Record<string, unknown>, actionId: string): ExperimentalShortcutConfig {
  const input = raw.experimentalShortcut && typeof raw.experimentalShortcut === "object"
    ? raw.experimentalShortcut as Record<string, unknown>
    : {};

  return createExperimentalShortcutConfig({
    shortcut: typeof input.shortcut === "string" && input.shortcut.trim()
      ? input.shortcut.trim()
      : undefined,
    sendEscapeBefore: typeof input.sendEscapeBefore === "boolean" ? input.sendEscapeBefore : undefined,
    dispatchTarget: ["auto", "active-editor", "window", "body"].includes(String(input.dispatchTarget))
      ? input.dispatchTarget as ExperimentalShortcutConfig["dispatchTarget"]
      : undefined,
    allowDirectWindowDispatch: typeof input.allowDirectWindowDispatch === "boolean"
      ? input.allowDirectWindowDispatch
      : undefined,
  }, actionId);
}

function sanitizeClickSequenceStep(value: unknown, fallbackSelector: string): ClickSequenceStep {
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};

  return createClickSequenceStep({
    selector: typeof raw.selector === "string" && raw.selector.trim()
      ? raw.selector.trim()
      : undefined,
    timeoutMs: Number.isFinite(raw.timeoutMs) && Number(raw.timeoutMs) >= 0 ? Number(raw.timeoutMs) : undefined,
    retryCount: Number.isFinite(raw.retryCount) && Number(raw.retryCount) >= 0 ? Number(raw.retryCount) : undefined,
    retryDelayMs: Number.isFinite(raw.retryDelayMs) && Number(raw.retryDelayMs) >= 0 ? Number(raw.retryDelayMs) : undefined,
    delayAfterMs: Number.isFinite(raw.delayAfterMs) && Number(raw.delayAfterMs) >= 0 ? Number(raw.delayAfterMs) : undefined,
  }, fallbackSelector);
}

function sanitizeExperimentalClickSequence(raw: Record<string, unknown>, actionId: string): ExperimentalClickSequenceConfig {
  const input = raw.experimentalClickSequence && typeof raw.experimentalClickSequence === "object"
    ? raw.experimentalClickSequence as Record<string, unknown>
    : {};

  return createExperimentalClickSequenceConfig({
    steps: Array.isArray(input.steps)
      ? input.steps.map(step => sanitizeClickSequenceStep(step, actionId || DEFAULT_CLICK_SEQUENCE_SELECTOR))
      : undefined,
    stopOnFailure: typeof input.stopOnFailure === "boolean" ? input.stopOnFailure : undefined,
  }, actionId);
}

function readExperimentalFlag(
  experimental: unknown,
  key: "nativeToolbarControl" | "internalCommandAdapter" | "shortcutAdapter" | "clickSequenceAdapter",
  fallback: boolean,
): boolean {
  if (!experimental || typeof experimental !== "object") {
    return fallback;
  }

  const value = (experimental as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeDisabledNativeButton(value: unknown): DisabledNativeButton | null {
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const surface = ensureRuntimeSurface(raw.surface);
  const selectors = Array.isArray(raw.selectors)
    ? Array.from(new Set(raw.selectors
      .filter((selector): selector is string => typeof selector === "string")
      .map(selector => selector.trim())
      .filter(Boolean)))
    : [];

  if (!id || !title || selectors.length === 0) {
    return null;
  }

  return {
    id,
    title,
    surface,
    selectors,
    iconMarkup: typeof raw.iconMarkup === "string" && raw.iconMarkup.trim() ? raw.iconMarkup : undefined,
  };
}

function sanitizeItem(value: unknown, index: number): PowerButtonItem {
  const fallback = createButtonItem({ order: index });
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const safeTitle = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : `Button ${index + 1}`;

  let actionType = ensureActionType(raw.actionType);
  let actionId = typeof raw.actionId === "string" ? raw.actionId.trim() : "";
  if (actionType === "external-plugin-command" && actionId && !isExternalCommandActionId(actionId)) {
    actionId = getDefaultActionId(actionType);
  }
  if (!actionId) {
    actionId = getDefaultActionId(actionType);
  }

  const sanitizedItem: PowerButtonItem = {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallback.id,
    title: safeTitle,
    visible: typeof raw.visible === "boolean" ? raw.visible : true,
    iconType: ensureIconType(raw.iconType),
    iconValue: typeof raw.iconValue === "string" && raw.iconValue.trim() ? raw.iconValue : DEFAULT_BUILTIN_ICON,
    surface: ensureSurface(raw.surface),
    order: Number.isFinite(raw.order) ? Number(raw.order) : index,
    actionType,
    actionId,
    tooltip: typeof raw.tooltip === "string" ? raw.tooltip : "",
  };

  if (actionType === "experimental-shortcut") {
    sanitizedItem.experimentalShortcut = sanitizeExperimentalShortcut(raw, actionId);
  }

  if (actionType === "experimental-click-sequence") {
    sanitizedItem.experimentalClickSequence = sanitizeExperimentalClickSequence(raw, actionId);
  }

  return sanitizedItem;
}

export function sanitizeConfig(input: unknown): PowerButtonsConfig {
  const defaults = createDefaultConfig();
  const raw = (input && typeof input === "object") ? input as Record<string, unknown> : {};
  const items = Array.isArray(raw.items)
    ? normalizeItemOrder(sortItems(raw.items.map((item, index) => sanitizeItem(item, index))))
    : defaults.items;
  const disabledNativeButtons = Array.isArray(raw.disabledNativeButtons)
    ? raw.disabledNativeButtons
      .map(sanitizeDisabledNativeButton)
      .filter((item): item is DisabledNativeButton => Boolean(item))
    : defaults.disabledNativeButtons;

  return {
    version: 2,
    desktopOnly: typeof raw.desktopOnly === "boolean" ? raw.desktopOnly : true,
    items,
    disabledNativeButtons,
    experimental: {
      nativeToolbarControl: readExperimentalFlag(raw.experimental, "nativeToolbarControl", false),
      internalCommandAdapter: readExperimentalFlag(raw.experimental, "internalCommandAdapter", false),
      shortcutAdapter: readExperimentalFlag(raw.experimental, "shortcutAdapter", true),
      clickSequenceAdapter: readExperimentalFlag(raw.experimental, "clickSequenceAdapter", true),
    },
  };
}
