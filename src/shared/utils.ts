import type {
  PowerButtonItem,
  PowerButtonsConfig,
  SurfaceType,
} from "@/shared/types";

export function createId(prefix = "pb"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneConfig(config: PowerButtonsConfig): PowerButtonsConfig {
  return JSON.parse(JSON.stringify(config));
}

export function normalizeItemOrder(items: PowerButtonItem[]): PowerButtonItem[] {
  return items.map((item, index) => ({
    ...item,
    order: index,
  }));
}

export function sortItems(items: PowerButtonItem[]): PowerButtonItem[] {
  return [...items].sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function isDockSurface(surface: SurfaceType): boolean {
  return surface.startsWith("dock-");
}

export function isStatusBarSurface(surface: SurfaceType): boolean {
  return surface.startsWith("statusbar-");
}
