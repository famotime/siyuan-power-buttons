import {
  createButtonItem,
  createDefaultConfig,
} from "@/core/config/defaults";
import {
  DEFAULT_BUILTIN_ICON,
  DEFAULT_PLUGIN_COMMAND,
} from "@/shared/constants";
import {
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

  return {
    shortcut: typeof input.shortcut === "string" && input.shortcut.trim()
      ? input.shortcut.trim()
      : actionId,
    sendEscapeBefore: Boolean(input.sendEscapeBefore),
    dispatchTarget: ["auto", "active-editor", "window", "body"].includes(String(input.dispatchTarget))
      ? input.dispatchTarget as ExperimentalShortcutConfig["dispatchTarget"]
      : "auto",
    allowDirectWindowDispatch: Boolean(input.allowDirectWindowDispatch),
  };
}

function sanitizeClickSequenceStep(value: unknown, fallbackSelector: string): ClickSequenceStep {
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};

  return {
    selector: typeof raw.selector === "string" && raw.selector.trim()
      ? raw.selector.trim()
      : fallbackSelector,
    timeoutMs: Number.isFinite(raw.timeoutMs) && Number(raw.timeoutMs) >= 0 ? Number(raw.timeoutMs) : 5000,
    retryCount: Number.isFinite(raw.retryCount) && Number(raw.retryCount) >= 0 ? Number(raw.retryCount) : 2,
    retryDelayMs: Number.isFinite(raw.retryDelayMs) && Number(raw.retryDelayMs) >= 0 ? Number(raw.retryDelayMs) : 300,
    delayAfterMs: Number.isFinite(raw.delayAfterMs) && Number(raw.delayAfterMs) >= 0 ? Number(raw.delayAfterMs) : 200,
  };
}

function sanitizeExperimentalClickSequence(raw: Record<string, unknown>, actionId: string): ExperimentalClickSequenceConfig {
  const input = raw.experimentalClickSequence && typeof raw.experimentalClickSequence === "object"
    ? raw.experimentalClickSequence as Record<string, unknown>
    : {};
  const fallbackSelector = actionId || "text:设置";
  const steps = Array.isArray(input.steps) && input.steps.length
    ? input.steps.map(step => sanitizeClickSequenceStep(step, fallbackSelector))
    : [sanitizeClickSequenceStep(undefined, fallbackSelector)];

  return {
    steps,
    stopOnFailure: input.stopOnFailure !== false,
  };
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

function sanitizeItem(value: unknown, index: number): PowerButtonItem {
  const fallback = createButtonItem({ order: index });
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const safeTitle = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : `Button ${index + 1}`;

  let actionType = ensureActionType(raw.actionType);
  let actionId = typeof raw.actionId === "string" ? raw.actionId.trim() : "";
  if (!actionId) {
    if (actionType === "experimental-shortcut") {
      actionId = "";
    } else if (actionType === "plugin-command") {
      actionId = DEFAULT_PLUGIN_COMMAND;
    } else if (actionType === "experimental-click-sequence") {
      actionId = "text:设置";
    } else {
      actionId = "globalSearch";
    }
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

  return {
    version: 2,
    desktopOnly: typeof raw.desktopOnly === "boolean" ? raw.desktopOnly : true,
    items,
    experimental: {
      nativeToolbarControl: readExperimentalFlag(raw.experimental, "nativeToolbarControl", false),
      internalCommandAdapter: readExperimentalFlag(raw.experimental, "internalCommandAdapter", false),
      shortcutAdapter: readExperimentalFlag(raw.experimental, "shortcutAdapter", true),
      clickSequenceAdapter: readExperimentalFlag(raw.experimental, "clickSequenceAdapter", true),
    },
  };
}
