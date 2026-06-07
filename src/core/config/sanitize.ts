import { BUILTIN_COMMANDS } from "@/core/commands/catalog";
import { isExternalCommandActionId } from "@/core/commands/external-command-types";
import {
  createButtonItem,
  createDefaultConfig,
} from "@/core/config/defaults";
import {
  DEFAULT_CLICK_SEQUENCE_SELECTOR,
  getDefaultActionId,
  sanitizeExperimentalClickSequenceConfig,
  sanitizeExperimentalShortcutConfig,
} from "@/core/config/item-defaults";
import {
  DEFAULT_ICONPARK_ICON,
} from "@/shared/constants";
import { normalizeIconValue } from "@/shared/icon-catalog";
import {
  SURFACES,
  ACTION_TYPES,
  CONFIGURABLE_SURFACES,
  ICON_TYPES,
} from "@/shared/types";
import {
  CONFIGURABLE_NATIVE_NAMES,
} from "@/core/surfaces/selection-toolbar-manager";
import {
  normalizeItemOrder,
  sortItems,
} from "@/shared/utils";
import type {
  ActionType,
  DisabledNativeButton,
  DisabledSelectionToolbarItem,
  IconType,
  PowerButtonItem,
  PowerButtonsConfig,
  SelectionToolbarLayoutItem,
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

function isBuiltinCommandActionId(value: string): boolean {
  return BUILTIN_COMMANDS.some(command => command.id === value);
}

function ensureIconType(value: unknown): IconType {
  if (value === "builtin") {
    return "iconpark";
  }
  return ICON_TYPES.includes(value as IconType) ? value as IconType : "iconpark";
}

function sanitizeExperimentalShortcut(raw: Record<string, unknown>, actionId: string) {
  const input = raw.experimentalShortcut && typeof raw.experimentalShortcut === "object"
    ? raw.experimentalShortcut as Record<string, unknown>
    : {};

  return sanitizeExperimentalShortcutConfig(input, actionId);
}

function sanitizeExperimentalClickSequence(raw: Record<string, unknown>, actionId: string) {
  const input = raw.experimentalClickSequence && typeof raw.experimentalClickSequence === "object"
    ? raw.experimentalClickSequence as Record<string, unknown>
    : {};

  return sanitizeExperimentalClickSequenceConfig(input, actionId || DEFAULT_CLICK_SEQUENCE_SELECTOR);
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

function sanitizeDisabledSelectionToolbarItem(value: unknown): DisabledSelectionToolbarItem | null {
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";

  if (!name || !CONFIGURABLE_NATIVE_NAMES.includes(name)) {
    return null;
  }

  return {
    name,
    title: title || name,
  };
}

function sanitizeSelectionToolbarLayoutItem(value: unknown): SelectionToolbarLayoutItem | null {
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const type = raw.type === "native" || raw.type === "custom" ? raw.type : "";
  const id = typeof raw.id === "string" ? raw.id.trim() : "";

  if (!type || !id) {
    return null;
  }

  return { type, id };
}

function sanitizeItem(value: unknown, index: number): PowerButtonItem {
  const fallback = createButtonItem({ order: index });
  const raw = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const safeTitle = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : `Button ${index + 1}`;

  let actionType = ensureActionType(raw.actionType);
  let actionId = typeof raw.actionId === "string" ? raw.actionId.trim() : "";
  if (actionType === "builtin-global-command" && actionId && !isBuiltinCommandActionId(actionId)) {
    actionId = getDefaultActionId(actionType);
  }
  if (actionType === "plugin-command" && actionId && !isExternalCommandActionId(actionId)) {
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
    iconValue: normalizeIconValue(
      typeof raw.iconType === "string" ? raw.iconType : "iconpark",
      typeof raw.iconValue === "string" && raw.iconValue.trim() ? raw.iconValue : DEFAULT_ICONPARK_ICON,
    ),
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
  const disabledSelectionToolbarItems = Array.isArray(raw.disabledSelectionToolbarItems)
    ? raw.disabledSelectionToolbarItems
      .map(sanitizeDisabledSelectionToolbarItem)
      .filter((item): item is DisabledSelectionToolbarItem => Boolean(item))
    : defaults.disabledSelectionToolbarItems;
  const selectionToolbarLayout = Array.isArray(raw.selectionToolbarLayout)
    ? raw.selectionToolbarLayout
      .map(sanitizeSelectionToolbarLayoutItem)
      .filter((item): item is SelectionToolbarLayoutItem => Boolean(item))
    : defaults.selectionToolbarLayout;

  return {
    version: 2,
    desktopOnly: typeof raw.desktopOnly === "boolean" ? raw.desktopOnly : true,
    items,
    disabledNativeButtons,
    disabledSelectionToolbarItems,
    selectionToolbarLayout,
    experimental: {
      nativeToolbarControl: readExperimentalFlag(raw.experimental, "nativeToolbarControl", false),
      internalCommandAdapter: readExperimentalFlag(raw.experimental, "internalCommandAdapter", false),
      shortcutAdapter: readExperimentalFlag(raw.experimental, "shortcutAdapter", true),
      clickSequenceAdapter: readExperimentalFlag(raw.experimental, "clickSequenceAdapter", true),
    },
  };
}
