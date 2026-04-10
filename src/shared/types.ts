export const SURFACES = [
  "topbar",
  "statusbar-left",
  "statusbar-right",
  "canvas",
  "dock-left-top",
  "dock-left-bottom",
  "dock-right-top",
  "dock-right-bottom",
  "dock-bottom-left",
  "dock-bottom-right",
] as const;

export const CONFIGURABLE_SURFACES = [
  "topbar",
  "statusbar-left",
  "statusbar-right",
  "canvas",
] as const;

export const ACTION_TYPES = [
  "builtin-global-command",
  "plugin-command",
  "open-url",
  "experimental-shortcut",
  "experimental-click-sequence",
] as const;

export const ICON_TYPES = [
  "builtin",
  "emoji",
  "svg",
] as const;

export type SurfaceType = (typeof SURFACES)[number];
export type ConfigurableSurfaceType = (typeof CONFIGURABLE_SURFACES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];
export type IconType = (typeof ICON_TYPES)[number];

export interface ExperimentalShortcutConfig {
  shortcut: string;
  sendEscapeBefore: boolean;
  dispatchTarget: "auto" | "active-editor" | "window" | "body";
  allowDirectWindowDispatch: boolean;
}

export interface ClickSequenceStep {
  selector: string;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  delayAfterMs: number;
}

export interface ExperimentalClickSequenceConfig {
  steps: ClickSequenceStep[];
  stopOnFailure: boolean;
}

export interface PowerButtonItem {
  id: string;
  title: string;
  visible: boolean;
  iconType: IconType;
  iconValue: string;
  surface: SurfaceType;
  order: number;
  actionType: ActionType;
  actionId: string;
  tooltip?: string;
  experimentalShortcut?: ExperimentalShortcutConfig;
  experimentalClickSequence?: ExperimentalClickSequenceConfig;
}

export interface PowerButtonsConfig {
  version: 2;
  desktopOnly: boolean;
  items: PowerButtonItem[];
  experimental: {
    nativeToolbarControl: boolean;
    internalCommandAdapter: boolean;
    shortcutAdapter: boolean;
    clickSequenceAdapter: boolean;
  };
}

export interface BuiltinCommandDefinition {
  id: string;
  title: string;
  category: string;
  surfaceSuggestion: SurfaceType[];
  requiresContext: boolean;
  stability: "stable";
}

export interface PluginCommandDefinition {
  id: string;
  title: string;
  description: string;
}

export type PreviewSource = "config" | "native";
export type PreviewSurfaceType = SurfaceType;

export interface PreviewButtonItem {
  id: string;
  title: string;
  visible: boolean;
  surface: PreviewSurfaceType;
  order: number;
  editable: boolean;
  source: PreviewSource;
  iconMarkup?: string;
  itemId?: string;
  nativeSelectors?: string[];
}
