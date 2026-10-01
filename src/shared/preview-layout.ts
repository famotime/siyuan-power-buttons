import type {
  PowerButtonItem,
  PowerButtonsConfig,
  PreviewButtonItem,
  SurfaceLayoutItem,
  SurfaceType,
} from "@/shared/types";
import { getItemSurfaces, getPreviewLayoutKey, normalizeSurface } from "@/shared/surface-metadata";
import {
  normalizeItemOrder,
  sortItems,
} from "@/shared/utils";

export interface PreviewLayoutOptions {
  includeHidden?: boolean;
  surfaceLayouts?: Partial<Record<SurfaceType, SurfaceLayoutItem[]>>;
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

  if (options.surfaceLayouts) {
    const previewSurfaceMap: Record<keyof PreviewLayout<T>, SurfaceType> = {
      topbar: "topbar",
      leftDockTop: "dock-left-top",
      leftDockBottom: "dock-left-bottom",
      rightDockTop: "dock-right-top",
      rightDockBottom: "dock-right-bottom",
      bottomDockLeft: "dock-bottom-left",
      bottomDockRight: "dock-bottom-right",
      statusbarLeft: "statusbar-left",
      statusbarRight: "statusbar-right",
      canvas: "canvas",
      selectionToolbar: "selection-toolbar",
      dockPanel: "dock-panel",
    };

    for (const [layoutKey, surface] of Object.entries(previewSurfaceMap) as [keyof PreviewLayout<T>, SurfaceType][]) {
      const surfaceLayout = options.surfaceLayouts[surface];
      if (!surfaceLayout) {
        continue;
      }
      const existing = layout[layoutKey] || [];
      const nativeItemsBefore: T[] = [];
      const nativeItemsAfter: T[] = [];
      const itemMap = new Map<string, T>();

      for (const item of existing) {
        const isNative = (item as unknown as { source?: string; editable?: boolean }).source === "native"
          || (item as unknown as { editable?: boolean }).editable === false;
        if (isNative) {
          const ord = (item as unknown as { order?: number }).order ?? 0;
          if (ord < 1000) {
            nativeItemsBefore.push(item);
          } else {
            nativeItemsAfter.push(item);
          }
        } else {
          const id = (item as unknown as { itemId?: string; id?: string }).itemId
            || (item as unknown as { id?: string }).id;
          if (id) {
            itemMap.set(id, item);
          }
        }
      }

      const reordered: T[] = [];
      const usedIds = new Set<string>();

      for (const entry of surfaceLayout) {
        if (entry.type === "button") {
          const item = itemMap.get(entry.id);
          if (item) {
            reordered.push(item);
            usedIds.add(entry.id);
          }
        } else if (entry.type === "divider") {
          reordered.push({
            id: entry.id,
            itemId: entry.id,
            title: entry.title || "",
            visible: true,
            surface,
            order: reordered.length,
            editable: true,
            draggable: true,
            source: "config",
            type: "divider",
          } as unknown as T);
        }
      }

      const remainingCustom: T[] = [];
      for (const [id, item] of itemMap) {
        if (!usedIds.has(id)) {
          remainingCustom.push(item);
        }
      }

      layout[layoutKey] = [...nativeItemsBefore, ...reordered, ...remainingCustom, ...nativeItemsAfter];
    }
  }

  return layout;
}

export function moveSurfaceItem(
  config: PowerButtonsConfig,
  dragItem: Pick<PreviewButtonItem, "id" | "itemId" | "surface" | "type">,
  targetSurface: SurfaceType,
  targetIndex: number,
): void {
  const normTarget = normalizeSurface(targetSurface);
  if (!config.surfaceLayouts) {
    config.surfaceLayouts = {};
  }

  if (!config.surfaceLayouts[normTarget]) {
    config.surfaceLayouts[normTarget] = config.items
      .filter(item => (item.surfaces || [item.surface]).includes(normTarget))
      .map(item => ({ type: "button", id: item.id }));
  }

  const targetList = config.surfaceLayouts[normTarget]!;
  const dragId = dragItem.itemId || dragItem.id;

  if (dragItem.type === "divider") {
    const existingIdx = targetList.findIndex(e => e.id === dragId);
    let movingEntry: SurfaceLayoutItem;
    if (existingIdx !== -1) {
      movingEntry = targetList.splice(existingIdx, 1)[0];
    } else {
      movingEntry = { type: "divider", id: dragId };
    }
    const clampedIndex = Math.max(0, Math.min(targetIndex, targetList.length));
    targetList.splice(clampedIndex, 0, movingEntry);
    return;
  }

  const button = config.items.find(item => item.id === dragId);
  if (!button) {
    return;
  }

  const sourceSurface = dragItem.surface ? normalizeSurface(dragItem.surface) : undefined;
  const isSameSurface = sourceSurface === normTarget;

  if (isSameSurface) {
    const existingIdx = targetList.findIndex(e => e.id === dragId && e.type === "button");
    let movingEntry: SurfaceLayoutItem;
    if (existingIdx !== -1) {
      movingEntry = targetList.splice(existingIdx, 1)[0];
    } else {
      movingEntry = { type: "button", id: dragId };
    }
    const clampedIndex = Math.max(0, Math.min(targetIndex, targetList.length));
    targetList.splice(clampedIndex, 0, movingEntry);
    return;
  }

  if (sourceSurface && config.surfaceLayouts[sourceSurface]) {
    config.surfaceLayouts[sourceSurface] = config.surfaceLayouts[sourceSurface]!.filter(
      e => !(e.type === "button" && e.id === dragId),
    );
  }

  const curSurfaces = getItemSurfaces(button);
  const nextSurfaces = curSurfaces.includes(normTarget)
    ? curSurfaces
    : [...curSurfaces.filter(s => s !== sourceSurface), normTarget];
  button.surface = normTarget;
  button.surfaces = nextSurfaces.length > 0 ? nextSurfaces : [normTarget];

  const existingIdx = targetList.findIndex(e => e.id === dragId && e.type === "button");
  if (existingIdx !== -1) {
    targetList.splice(existingIdx, 1);
  }
  const clampedIndex = Math.max(0, Math.min(targetIndex, targetList.length));
  targetList.splice(clampedIndex, 0, { type: "button", id: dragId });

  // When moving to a different surface, also update relative order in config.items
  const remaining = config.items.filter(item => item.id !== dragId);
  const targetItems = remaining.filter(item => getItemSurfaces(item).includes(normTarget));
  const clamped = Math.max(0, Math.min(targetIndex, targetItems.length));
  let insertionIndex = remaining.length;
  if (targetItems.length > 0) {
    if (clamped >= targetItems.length) {
      insertionIndex = remaining.findIndex(item => item.id === targetItems[targetItems.length - 1].id) + 1;
    } else {
      insertionIndex = remaining.findIndex(item => item.id === targetItems[clamped].id);
    }
  }
  remaining.splice(insertionIndex, 0, button);
  config.items = normalizeItemOrder(remaining);
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
