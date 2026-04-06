import type {
  PowerButtonItem,
  PreviewButtonItem,
  SurfaceType,
} from "@/shared/types";
import { getPreviewLayoutKey } from "@/shared/surface-metadata";
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
    layout[getPreviewLayoutKey(item.surface)].push(item);
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
