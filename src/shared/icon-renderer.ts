import { DEFAULT_ICONPARK_ICON } from "@/shared/constants";
import {
  getIconParkMarkup,
  normalizeIconValue,
} from "@/shared/icon-catalog";

type QueryRoot = Pick<ParentNode, "querySelector"> | null | undefined;

const STROKED_SHAPE_TAGS = /<(path|circle|rect|ellipse|polygon|polyline)\b([^>]*\bstroke="[^"]+"[^>]*?)(\/?)>/g;

const BUNDLED_ICON_MARKUP: Partial<Record<string, string>> = {
  iconHome: `
    <svg class="siyuan-power-buttons__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 3 3 10v11h6v-6h6v6h6V10zm7 16h-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6H5v-8l7-5.44L19 11z" />
    </svg>
  `,
  iconPlus: `
    <svg class="siyuan-power-buttons__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
    </svg>
  `,
  iconTag: `
    <svg class="siyuan-power-buttons__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 11.5V5h7.5L21 15.5 15.5 21 5 10.5zm2-4.5v2.67L15.5 20l2.67-2.67L9.67 7zm2 .25A1.25 1.25 0 1 0 7 9.75a1.25 1.25 0 0 0 0-2.5Z" />
    </svg>
  `,
};

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createSpriteIconMarkup(iconName: string): string {
  return `<svg class="siyuan-power-buttons__icon" aria-hidden="true"><use xlink:href="#${escapeAttribute(iconName)}"></use></svg>`;
}

function hardenStrokeOnlySvgFill(svg: string): string {
  // SiYuan applies a global `svg { fill: currentColor; }`, so stroke-only IconPark
  // markup needs explicit `fill:none` on shapes to avoid turning into solid blocks.
  return svg.replace(STROKED_SHAPE_TAGS, (match, tag: string, attrs: string, selfClosing: string) => {
    const hasFill = /\bfill="/.test(attrs);
    const fillIsNone = /\bfill="none"/.test(attrs);
    const hasStyle = /\bstyle="/.test(attrs);
    const styleDefinesFill = /\bstyle="[^"]*\bfill\s*:/.test(attrs);

    if (hasFill && !fillIsNone) {
      return match;
    }

    let nextAttrs = attrs;
    if (!hasFill) {
      nextAttrs += " fill=\"none\"";
    }

    if (hasStyle) {
      if (styleDefinesFill) {
        return `<${tag}${nextAttrs}${selfClosing}>`;
      }
      nextAttrs = nextAttrs.replace(/\bstyle="([^"]*)"/, (_, style: string) => {
        const normalized = style.trim().endsWith(";") ? style.trim() : `${style.trim()};`;
        return `style="${normalized}fill:none"`;
      });
    }
    else {
      nextAttrs += " style=\"fill:none\"";
    }

    return `<${tag}${nextAttrs}${selfClosing}>`;
  });
}

function hasHostIconSymbol(iconName: string, root?: QueryRoot): boolean {
  const queryRoot = root || (typeof document !== "undefined" ? document : null);
  if (!queryRoot || typeof queryRoot.querySelector !== "function") {
    return false;
  }

  return Boolean(queryRoot.querySelector(`[id="${iconName}"]`));
}

export function renderBuiltinIconMarkup(iconName: string, root?: QueryRoot): string {
  const normalized = iconName.trim() || DEFAULT_ICONPARK_ICON;
  if (hasHostIconSymbol(normalized, root) || !BUNDLED_ICON_MARKUP[normalized]) {
    return createSpriteIconMarkup(normalized);
  }

  return BUNDLED_ICON_MARKUP[normalized];
}

export function renderIconMarkup(
  item: Pick<{ iconType: string; iconValue: string }, "iconType" | "iconValue">,
  root?: QueryRoot,
): string {
  if (item.iconType === "emoji") {
    const safeEmoji = item.iconValue || "⚡";
    return `<span class="emoji-icon">${safeEmoji}</span>`;
  }

  if (item.iconType === "svg") {
    return item.iconValue.trim() || renderBuiltinIconMarkup(DEFAULT_ICONPARK_ICON, root);
  }

  const normalizedIcon = normalizeIconValue(item.iconType, item.iconValue);
  const iconParkMarkup = getIconParkMarkup(normalizedIcon);
  return iconParkMarkup
    ? hardenStrokeOnlySvgFill(iconParkMarkup)
    : renderBuiltinIconMarkup(DEFAULT_ICONPARK_ICON, root);
}
