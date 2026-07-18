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
  | "canvas"
  | "selectionToolbar";

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
  "selection-toolbar": "selectionToolbar",
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

/**
 * 检查思源的全局布局配置（uiLayout）中是否已经缓存了该自定义 Dock 的位置。
 * 如果已经缓存，说明思源将优先从其自身的缓存恢复该 Dock 的位置与顺序，
 * 此时插件端设置的 order 属性可能不再对主界面生效。
 */
export function checkHasSiyuanDockLayout(itemId: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uiLayout = (window as any).siyuan?.config?.uiLayout;
  if (!uiLayout) {
    return false;
  }
  const targetType = `siyuan-power-buttons-${itemId}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkDock = (dock: any): boolean => {
    if (!dock || !Array.isArray(dock.data)) {
      return false;
    }
    // dock.data 是一个二维数组，结构为 Array<IUILayoutDockTab[]>
    return dock.data.some((group: any) =>
      Array.isArray(group) && group.some((tab: any) => tab && tab.type === targetType),
    );
  };

  return checkDock(uiLayout.left) || checkDock(uiLayout.right) || checkDock(uiLayout.bottom);
}
