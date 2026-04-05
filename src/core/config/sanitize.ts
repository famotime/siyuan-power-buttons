import {
  createButtonItem,
  createDefaultConfig,
} from "@/core/config/defaults";
import {
  DEFAULT_BUILTIN_ICON,
  DEFAULT_CUSTOM_ACTION,
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

function shouldMigrateLegacyOpenSettingsPreset(raw: Record<string, unknown>, actionType: ActionType, actionId: string): boolean {
  if (actionType !== "builtin-global-command" || actionId !== "fileTree") {
    return false;
  }

  const title = typeof raw.title === "string" ? raw.title.trim().toLowerCase() : "";
  const tooltip = typeof raw.tooltip === "string" ? raw.tooltip.trim().toLowerCase() : "";

  return title === "open settings"
    || title === "插件设置"
    || tooltip.includes("power buttons settings")
    || tooltip.includes("快捷按钮设置");
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
    if (actionType === "custom-action") {
      actionId = DEFAULT_CUSTOM_ACTION;
    } else if (actionType === "experimental-shortcut") {
      actionId = "Ctrl+B";
    } else {
      actionId = "globalSearch";
    }
  }

  if (shouldMigrateLegacyOpenSettingsPreset(raw, actionType, actionId)) {
    actionType = "custom-action";
    actionId = DEFAULT_CUSTOM_ACTION;
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
      nativeToolbarControl: Boolean(raw.experimental && typeof raw.experimental === "object" && (raw.experimental as Record<string, unknown>).nativeToolbarControl),
      internalCommandAdapter: Boolean(raw.experimental && typeof raw.experimental === "object" && (raw.experimental as Record<string, unknown>).internalCommandAdapter),
      shortcutAdapter: Boolean(raw.experimental && typeof raw.experimental === "object" && (raw.experimental as Record<string, unknown>).shortcutAdapter),
      clickSequenceAdapter: Boolean(raw.experimental && typeof raw.experimental === "object" && (raw.experimental as Record<string, unknown>).clickSequenceAdapter),
    },
  };
}
