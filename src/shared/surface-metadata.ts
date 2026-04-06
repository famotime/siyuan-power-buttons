import type { TPluginDockPosition } from "siyuan";
import { CONFIGURABLE_SURFACES } from "@/shared/types";
import type { PreviewSurfaceType, SurfaceType } from "@/shared/types";

export type PreviewLayoutKey =
  | "topbar"
  | "leftDockTop"
  | "leftDockBottom"
  | "rightDockTop"
  | "rightDockBottom"
  | "bottomDockLeft"
  | "bottomDockRight"
  | "statusbarLeft"
  | "statusbarRight"
  | "canvas";

const PREVIEW_LAYOUT_KEYS: Record<PreviewSurfaceType, PreviewLayoutKey> = {
  topbar: "topbar",
  "dock-left-top": "leftDockTop",
  "dock-left-bottom": "leftDockBottom",
  "dock-right-top": "rightDockTop",
  "dock-right-bottom": "rightDockBottom",
  "dock-bottom-left": "bottomDockLeft",
  "dock-bottom-right": "bottomDockRight",
  "statusbar-left": "statusbarLeft",
  "statusbar-right": "statusbarRight",
  canvas: "canvas",
};

const DOCK_POSITIONS: Record<Extract<SurfaceType, `dock-${string}`>, TPluginDockPosition> = {
  "dock-left-top": "LeftTop",
  "dock-left-bottom": "LeftBottom",
  "dock-right-top": "RightTop",
  "dock-right-bottom": "RightBottom",
  "dock-bottom-left": "BottomLeft",
  "dock-bottom-right": "BottomRight",
};

export function getPreviewLayoutKey(surface: PreviewSurfaceType): PreviewLayoutKey {
  return PREVIEW_LAYOUT_KEYS[surface];
}

export function isDockSurface(surface: SurfaceType): surface is Extract<SurfaceType, `dock-${string}`> {
  return surface.startsWith("dock-");
}

export function isStatusBarSurface(surface: SurfaceType): surface is Extract<SurfaceType, `statusbar-${string}`> {
  return surface.startsWith("statusbar-");
}

export function isConfigurableSurface(surface: SurfaceType): surface is typeof CONFIGURABLE_SURFACES[number] {
  return CONFIGURABLE_SURFACES.includes(surface as typeof CONFIGURABLE_SURFACES[number]);
}

export function getDockPosition(surface: Extract<SurfaceType, `dock-${string}`>): TPluginDockPosition {
  return DOCK_POSITIONS[surface];
}
