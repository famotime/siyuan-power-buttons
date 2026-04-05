export const SURFACES = [
  "topbar",
  "statusbar-left",
  "statusbar-right",
  "dock-left-top",
  "dock-left-bottom",
  "dock-right-top",
  "dock-right-bottom",
  "dock-bottom-left",
  "dock-bottom-right",
] as const;

export const ACTION_TYPES = [
  "builtin-global-command",
  "plugin-command",
  "custom-action",
  "open-url",
] as const;

export const ICON_TYPES = [
  "builtin",
  "emoji",
  "svg",
] as const;

export type SurfaceType = (typeof SURFACES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];
export type IconType = (typeof ICON_TYPES)[number];

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
}

export interface PowerButtonsConfig {
  version: 1;
  desktopOnly: boolean;
  items: PowerButtonItem[];
  experimental: {
    nativeToolbarControl: boolean;
    internalCommandAdapter: boolean;
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
