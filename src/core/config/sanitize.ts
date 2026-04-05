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
  ICON_TYPES,
  SURFACES,
} from "@/shared/types";
import {
  normalizeItemOrder,
  sortItems,
} from "@/shared/utils";
import type {
  ActionType,
  IconType,
  PowerButtonItem,
  PowerButtonsConfig,
  SurfaceType,
} from "@/shared/types";

function ensureSurface(value: unknown): SurfaceType {
  return SURFACES.includes(value as SurfaceType) ? value as SurfaceType : "topbar";
}

function ensureActionType(value: unknown): ActionType {
  return ACTION_TYPES.includes(value as ActionType) ? value as ActionType : "builtin-global-command";
}

function ensureIconType(value: unknown): IconType {
  return ICON_TYPES.includes(value as IconType) ? value as IconType : "builtin";
}

function sanitizeItem(value: unknown, index: number): PowerButtonItem {
  const fallback = createButtonItem({ order: index });
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const actionType = ensureActionType(raw.actionType);
  const safeTitle = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : `Button ${index + 1}`;

  let actionId = typeof raw.actionId === "string" ? raw.actionId.trim() : "";
  if (!actionId) {
    actionId = actionType === "custom-action" ? DEFAULT_CUSTOM_ACTION : "globalSearch";
  }

  return {
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
}

export function sanitizeConfig(input: unknown): PowerButtonsConfig {
  const defaults = createDefaultConfig();
  const raw = (input && typeof input === "object") ? input as Record<string, unknown> : {};
  const items = Array.isArray(raw.items)
    ? normalizeItemOrder(sortItems(raw.items.map((item, index) => sanitizeItem(item, index))))
    : defaults.items;

  return {
    version: 1,
    desktopOnly: typeof raw.desktopOnly === "boolean" ? raw.desktopOnly : true,
    items,
    experimental: {
      nativeToolbarControl: Boolean(raw.experimental && typeof raw.experimental === "object" && (raw.experimental as Record<string, unknown>).nativeToolbarControl),
      internalCommandAdapter: Boolean(raw.experimental && typeof raw.experimental === "object" && (raw.experimental as Record<string, unknown>).internalCommandAdapter),
    },
  };
}
