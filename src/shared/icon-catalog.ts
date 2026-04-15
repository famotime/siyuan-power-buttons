import {
  ICONPARK_CATEGORIES,
  ICONPARK_ICON_MARKUP_MAP as GENERATED_ICONPARK_ICON_MARKUP_MAP,
  ICONPARK_ICON_OPTIONS as GENERATED_ICONPARK_ICON_OPTIONS,
} from "@/generated/iconpark-catalog";
import type { IconParkIconOption } from "@/generated/iconpark-catalog";
import { DEFAULT_ICONPARK_ICON } from "@/shared/constants";

export type { IconParkIconOption };

export const COMMON_EMOJI_OPTIONS = [
  "⚡",
  "🔍",
  "⚙️",
  "📝",
  "📌",
  "⭐",
  "📚",
  "🧩",
  "📎",
];

const LEGACY_BUILTIN_TO_ICONPARK: Record<string, string> = {
  iconSearch: "iconpark:Search",
  iconSettings: "iconpark:Setting",
  iconList: "iconpark:ListView",
  iconMenu: "iconpark:MenuFold",
  iconHome: "iconpark:Home",
  iconRefresh: "iconpark:Refresh",
  iconPlus: "iconpark:Plus",
  iconRight: "iconpark:Right",
  iconLeft: "iconpark:Left",
  iconLayout: "iconpark:GraphicDesign",
  iconDock: "iconpark:ApplicationMenu",
  iconBookmark: "iconpark:Bookmark",
  iconTag: "iconpark:Tag",
  iconGraph: "iconpark:ChartGraph",
  iconFile: "iconpark:FileText",
  iconInbox: "iconpark:InboxIn",
  iconHelp: "iconpark:Help",
  iconInfo: "iconpark:Info",
};

export const ICONPARK_ICON_OPTIONS = GENERATED_ICONPARK_ICON_OPTIONS;
export const ICONPARK_ICON_MARKUP_MAP = GENERATED_ICONPARK_ICON_MARKUP_MAP;

const ICONPARK_VALUES = new Set(ICONPARK_ICON_OPTIONS.map(icon => icon.value));

export function getDefaultIconParkIcon(): string {
  return DEFAULT_ICONPARK_ICON;
}

export function getIconParkCategories(): string[] {
  return ICONPARK_CATEGORIES;
}

export function normalizeIconValue(iconType: string, iconValue: string): string {
  if (iconType === "iconpark") {
    const trimmed = iconValue.trim();
    if (!trimmed) {
      return DEFAULT_ICONPARK_ICON;
    }
    return ICONPARK_VALUES.has(trimmed) ? trimmed : DEFAULT_ICONPARK_ICON;
  }

  if (iconType === "builtin") {
    return LEGACY_BUILTIN_TO_ICONPARK[iconValue.trim()] || DEFAULT_ICONPARK_ICON;
  }

  return iconValue;
}

export function getIconParkMarkup(iconValue: string): string | undefined {
  return ICONPARK_ICON_MARKUP_MAP[normalizeIconValue("iconpark", iconValue)];
}

export function filterIconParkIcons(keyword: string, category = ""): IconParkIconOption[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedCategory = category.trim();

  return ICONPARK_ICON_OPTIONS.filter((icon) => {
    if (normalizedCategory && icon.category !== normalizedCategory) {
      return false;
    }
    if (!normalizedKeyword) {
      return true;
    }
    return icon.value.toLowerCase().includes(normalizedKeyword)
      || icon.name.toLowerCase().includes(normalizedKeyword)
      || icon.label.toLowerCase().includes(normalizedKeyword)
      || icon.keywords.some(item => item.toLowerCase().includes(normalizedKeyword));
  });
}
