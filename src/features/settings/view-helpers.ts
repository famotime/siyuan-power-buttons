import { DEFAULT_ICONPARK_ICON, SURFACE_LABELS } from "@/shared/constants";
import { hardenStrokeOnlySvgFill, renderIconMarkup } from "@/shared/icon-renderer";
import {
  createNativeFallbackIconMarkup,
  resolveNativeIconMarkup,
} from "@/shared/native-icon";
import type { PowerButtonItem, PreviewButtonItem } from "@/shared/types";

export type SvgPreviewState = {
  markup: string;
  invalid: boolean;
};

export function renderNamedIcon(iconName: string, ownerDocument: Document = document): string {
  return renderIconMarkup({
    iconType: "iconpark",
    iconValue: iconName,
  }, ownerDocument);
}

export function renderSettingsIconMarkup(
  item: Pick<PowerButtonItem, "iconType" | "iconValue">,
  ownerDocument: Document = document,
): string {
  if (item.iconType === "emoji") {
    return `<span class="emoji-icon">${item.iconValue || "⚡"}</span>`;
  }
  if (item.iconType === "svg") {
    const raw = item.iconValue?.trim();
    return raw ? hardenStrokeOnlySvgFill(raw, ownerDocument) : renderNamedIcon(DEFAULT_ICONPARK_ICON, ownerDocument);
  }
  return renderIconMarkup(item, ownerDocument);
}

export function resolveSvgPreviewState(
  item: Pick<PowerButtonItem, "iconType" | "iconValue">,
  ownerDocument: Document = document,
): SvgPreviewState {
  if (item.iconType !== "svg") {
    return {
      markup: renderSettingsIconMarkup(item, ownerDocument),
      invalid: false,
    };
  }

  const trimmed = item.iconValue.trim();
  if (!trimmed) {
    return {
      markup: renderNamedIcon(DEFAULT_ICONPARK_ICON, ownerDocument),
      invalid: false,
    };
  }

  if (!trimmed.startsWith("<svg")) {
    return {
      markup: renderNamedIcon(DEFAULT_ICONPARK_ICON, ownerDocument),
      invalid: true,
    };
  }

  try {
    const parser = new ownerDocument.defaultView!.DOMParser();
    const parsed = parser.parseFromString(trimmed, "image/svg+xml");
    if (parsed.querySelector("parsererror") || parsed.documentElement.tagName.toLowerCase() !== "svg") {
      return {
        markup: renderNamedIcon(DEFAULT_ICONPARK_ICON, ownerDocument),
        invalid: true,
      };
    }
  } catch {
    return {
      markup: renderNamedIcon(DEFAULT_ICONPARK_ICON, ownerDocument),
      invalid: true,
    };
  }

  return {
    markup: hardenStrokeOnlySvgFill(trimmed, ownerDocument),
    invalid: false,
  };
}

export function renderPreviewIconMarkup(item: PreviewButtonItem, ownerDocument: Document = document): string {
  if (item.source === "disabled-native") {
    return resolveNativeIconMarkup(item.iconMarkup, ownerDocument)
      || createNativeFallbackIconMarkup(item.title);
  }
  const markup = item.iconMarkup || renderNamedIcon(DEFAULT_ICONPARK_ICON, ownerDocument);
  return resolveNativeIconMarkup(markup, ownerDocument) || markup;
}

export function buildPreviewChipClass(item: PreviewButtonItem, selectedId: string): Record<string, boolean> {
  return {
    "is-active": item.itemId === selectedId,
    "is-native": !item.editable,
    "is-suppressed": Boolean(item.suppressed),
    "is-hidden": item.editable && !item.visible,
    "is-draggable": Boolean(item.draggable ?? item.editable),
  };
}

export function getPreviewChipTitle(item: PreviewButtonItem): string {
  if (item.suppressed) {
    return `${item.title} — 点击恢复`;
  }
  if (!item.editable) {
    return `${item.title} — 点击禁用`;
  }
  return `${item.title} — ${item.visible ? "显示中" : "隐藏中"}`;
}

export function getSurfaceLabel(value: string): string {
  return SURFACE_LABELS[value];
}
