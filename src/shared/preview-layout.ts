import type {
  PowerButtonItem,
  PreviewButtonItem,
  SurfaceType,
} from "@/shared/types";
import {
  normalizeItemOrder,
  sortItems,
} from "@/shared/utils";

export interface PreviewLayoutOptions {
  includeHidden?: boolean;
}

export interface PreviewLayout<T> {
  topbar: T[];
  leftDockTop: T[];
  leftDockBottom: T[];
  rightDockTop: T[];
  rightDockBottom: T[];
  bottomDockLeft: T[];
  bottomDockRight: T[];
  statusbarLeft: T[];
  statusbarRight: T[];
  canvas: T[];
}

export function buildPreviewLayout<T extends Pick<PreviewButtonItem, "surface" | "order" | "visible">>(
  items: T[],
  options: PreviewLayoutOptions = {},
): PreviewLayout<T> {
  const layout: PreviewLayout<T> = {
    topbar: [],
    leftDockTop: [],
    leftDockBottom: [],
    rightDockTop: [],
    rightDockBottom: [],
    bottomDockLeft: [],
    bottomDockRight: [],
    statusbarLeft: [],
    statusbarRight: [],
    canvas: [],
  };

  for (const item of sortItems(items).filter(entry => options.includeHidden || entry.visible)) {
    switch (item.surface) {
      case "topbar":
        layout.topbar.push(item);
        break;
      case "dock-left-top":
        layout.leftDockTop.push(item);
        break;
      case "dock-left-bottom":
        layout.leftDockBottom.push(item);
        break;
      case "dock-right-top":
        layout.rightDockTop.push(item);
        break;
      case "dock-right-bottom":
        layout.rightDockBottom.push(item);
        break;
      case "dock-bottom-left":
        layout.bottomDockLeft.push(item);
        break;
      case "dock-bottom-right":
        layout.bottomDockRight.push(item);
        break;
      case "statusbar-left":
        layout.statusbarLeft.push(item);
        break;
      case "statusbar-right":
        layout.statusbarRight.push(item);
        break;
      case "canvas":
        layout.canvas.push(item);
        break;
      default:
        layout.canvas.push(item);
        break;
    }
  }

  return layout;
}

export function movePreviewItem(
  items: PowerButtonItem[],
  itemId: string,
  targetSurface: SurfaceType,
  targetIndex: number,
): PowerButtonItem[] {
  const sortedItems = sortItems(items);
  const sourceIndex = sortedItems.findIndex(item => item.id === itemId);
  if (sourceIndex === -1) {
    return items;
  }

  const movingItem = {
    ...sortedItems[sourceIndex],
    surface: targetSurface,
  };
  const remaining = sortedItems.filter(item => item.id !== itemId);
  const targetItems = remaining.filter(item => item.surface === targetSurface);
  const clampedIndex = Math.max(0, Math.min(targetIndex, targetItems.length));

  let insertionIndex = remaining.length;
  if (targetItems.length > 0) {
    if (clampedIndex >= targetItems.length) {
      insertionIndex = remaining.findIndex(item => item.id === targetItems[targetItems.length - 1].id) + 1;
    } else {
      insertionIndex = remaining.findIndex(item => item.id === targetItems[clampedIndex].id);
    }
  }

  remaining.splice(insertionIndex, 0, movingItem);
  return normalizeItemOrder(remaining);
}
