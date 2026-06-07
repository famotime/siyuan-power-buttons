import { computed, ref } from "vue";
import {
  COMMON_EMOJI_OPTIONS,
  filterIconParkIcons,
  getIconParkCategories,
} from "@/shared/icon-catalog";
import { ICON_TYPES } from "@/shared/types";
import { applyIconTypeDefaults } from "@/features/settings/action-config";
import type { PowerButtonItem } from "@/shared/types";

export interface UseSettingsIconsOptions {
  selectedItem: () => PowerButtonItem | undefined;
  onPersist: () => Promise<void>;
}

export function useSettingsIcons(options: UseSettingsIconsOptions) {
  const { selectedItem, onPersist } = options;

  const iconKeyword = ref("");
  const iconCategory = ref("");

  const iconTypes = ICON_TYPES.map(value => ({
    value,
    label: value === "iconpark" ? "IconPark" : value === "emoji" ? "Emoji" : "SVG",
  }));

  const iconParkCategories = computed(() => getIconParkCategories());
  const commonEmojiOptions = COMMON_EMOJI_OPTIONS;

  const filteredIconParkIcons = computed(() => {
    const result = filterIconParkIcons(iconKeyword.value, iconCategory.value);
    return result.length ? result : filterIconParkIcons("", iconCategory.value);
  });

  async function selectIconType(value: PowerButtonItem["iconType"]): Promise<void> {
    const item = selectedItem();
    if (!item || item.iconType === value) {
      return;
    }
    item.iconType = value;
    applyIconTypeDefaults(item);
    await onPersist();
  }

  async function selectIconParkIcon(value: string): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    item.iconType = "iconpark";
    item.iconValue = value;
    await onPersist();
  }

  async function selectEmojiIcon(value: string): Promise<void> {
    const item = selectedItem();
    if (!item) {
      return;
    }
    item.iconType = "emoji";
    item.iconValue = value;
    await onPersist();
  }

  return {
    iconKeyword,
    iconCategory,
    iconTypes,
    iconParkCategories,
    commonEmojiOptions,
    filteredIconParkIcons,
    selectIconType,
    selectIconParkIcon,
    selectEmojiIcon,
  };
}
