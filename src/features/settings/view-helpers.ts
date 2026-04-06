import { DEFAULT_BUILTIN_ICON, SURFACE_LABELS } from "@/shared/constants";
import { renderBuiltinIconMarkup as renderSharedBuiltinIconMarkup } from "@/shared/icon-renderer";
import type { PowerButtonItem, PreviewButtonItem } from "@/shared/types";

export function renderNamedIcon(iconName: string, ownerDocument: Document = document): string {
  return renderSharedBuiltinIconMarkup(iconName, ownerDocument);
}

export function renderSettingsIconMarkup(
  item: Pick<PowerButtonItem, "iconType" | "iconValue">,
  ownerDocument: Document = document,
): string {
  if (item.iconType === "emoji") {
    return `<span class="emoji-icon">${item.iconValue || "⚡"}</span>`;
  }
  if (item.iconType === "svg") {
    return item.iconValue || renderNamedIcon(DEFAULT_BUILTIN_ICON, ownerDocument);
  }
  return renderNamedIcon(item.iconValue || DEFAULT_BUILTIN_ICON, ownerDocument);
}

export function renderPreviewIconMarkup(item: PreviewButtonItem, ownerDocument: Document = document): string {
  return item.iconMarkup || renderNamedIcon(DEFAULT_BUILTIN_ICON, ownerDocument);
}

export function buildPreviewChipClass(item: PreviewButtonItem, selectedId: string): Record<string, boolean> {
  return {
    "is-active": item.itemId === selectedId,
    "is-native": !item.editable,
    "is-hidden": item.editable && !item.visible,
    "is-draggable": item.editable,
  };
}

export function getPreviewChipTitle(item: PreviewButtonItem): string {
  if (!item.editable) {
    return `${item.title} · 原生按钮，仅预览`;
  }
  return `${item.title} · ${item.visible ? "显示中" : "隐藏中"} · 可拖拽调整`;
}

export function getSurfaceLabel(value: string): string {
  return SURFACE_LABELS[value];
}
