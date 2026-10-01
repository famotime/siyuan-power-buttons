import type {
  PowerButtonItem,
  PreviewButtonItem,
  SurfaceType,
} from "@/shared/types";
import { getItemSurfaces, getPreviewLayoutKey, normalizeSurface } from "@/shared/surface-metadata";
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
  selectionToolbar: T[];
  dockPanel: T[];
}

export function buildPreviewLayout<T extends Pick<PreviewButtonItem, "surface" | "order" | "visible"> & { surfaces?: SurfaceType[] }>(
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
    selectionToolbar: [],
    dockPanel: [],
  };

  for (const item of sortItems(items).filter(entry => options.includeHidden || entry.visible)) {
    const surfaces = getItemSurfaces(item);
    for (const surface of surfaces) {
      const key = getPreviewLayoutKey(surface);
      if (key && layout[key]) {
        layout[key].push({
          ...item,
          surface,
        });
      }
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
  const normTarget = normalizeSurface(targetSurface);
  const sortedItems = sortItems(items);
  const sourceIndex = sortedItems.findIndex(item => item.id === itemId);
  if (sourceIndex === -1) {
    return items;
  }

  const existingItem = sortedItems[sourceIndex];
  const existingSurfaces = getItemSurfaces(existingItem);
  const nextSurfaces = existingSurfaces.includes(normTarget)
    ? existingSurfaces
    : [...existingSurfaces.filter(s => s !== existingItem.surface), normTarget];

  const movingItem: PowerButtonItem = {
    ...existingItem,
    surface: normTarget,
    surfaces: nextSurfaces.length > 0 ? nextSurfaces : [normTarget],
  };
  const remaining = sortedItems.filter(item => item.id !== itemId);
  const targetItems = remaining.filter(item => getItemSurfaces(item).includes(normTarget));
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
