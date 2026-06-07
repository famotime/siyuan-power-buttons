import { computed, ref } from "vue";
import {
  NATIVE_TOOLBAR_BUTTON_LABELS,
  CONFIGURABLE_NATIVE_NAMES,
} from "@/core/surfaces/selection-toolbar-manager";
import {
  moveItem,
} from "@/shared/utils";
import type {
  DisabledNativeButton,
  PowerButtonItem,
  PowerButtonsConfig,
  SelectionToolbarLayoutItem,
} from "@/shared/types";
import { renderSettingsIconMarkup } from "@/features/settings/view-helpers";
import { getNativeToolbarIcon } from "@/shared/native-icon";
import { isSameNativeButton } from "@/features/settings/controller/preview-interactions";

export type SelectionToolbarPreviewItem = {
  key: string;
  type: "native" | "custom";
  id: string;
  title: string;
  iconMarkup: string;
  disabled: boolean;
  item?: PowerButtonItem;
};

export interface UseSettingsToolbarOptions {
  config: PowerButtonsConfig;
  onPersist: () => Promise<void>;
  onPreviewDragStart: (event: DragEvent, item: any) => void;
  onPreviewSurfaceDrop: (surface: string, index?: number) => Promise<void>;
  previewDragItem: { value: any };
  selectedId: { value: string };
}

export function useSettingsToolbar(options: UseSettingsToolbarOptions) {
  const { config, onPersist, onPreviewDragStart, onPreviewSurfaceDrop, previewDragItem, selectedId } = options;

  const selectionToolbarDragIndex = ref<number | null>(null);
  const selectionToolbarPreviewDragIndex = ref<number | null>(null);

  function createSelectionToolbarLayoutKey(item: SelectionToolbarLayoutItem): string {
    return `${item.type}:${item.id}`;
  }

  function toSelectionToolbarLayoutItem(item: SelectionToolbarPreviewItem): SelectionToolbarLayoutItem {
    return {
      type: item.type,
      id: item.id,
    };
  }

  /** 浮动工具栏原生按钮列表（含禁用状态和图标） */
  const selectionToolbarNativeButtons = computed(() => {
    const disabledNames = new Set(config.disabledSelectionToolbarItems.map(item => item.name));
    return CONFIGURABLE_NATIVE_NAMES.map(name => {
      const label = NATIVE_TOOLBAR_BUTTON_LABELS[name] || name;
      return {
        name,
        label,
        disabled: disabledNames.has(name),
        iconMarkup: getNativeToolbarIcon(name, label),
      };
    });
  });

  /** 浮动工具栏中用户自定义的按钮 */
  const selectionToolbarCustomItems = computed(() => {
    return config.items
      .filter(item => item.surface === "selection-toolbar")
      .sort((a, b) => a.order - b.order);
  });

  const selectionToolbarPreviewItems = computed<SelectionToolbarPreviewItem[]>(() => {
    const disabledNames = new Set(config.disabledSelectionToolbarItems.map(item => item.name));
    const nativeItems: SelectionToolbarPreviewItem[] = CONFIGURABLE_NATIVE_NAMES.map(name => {
      const label = NATIVE_TOOLBAR_BUTTON_LABELS[name] || name;
      return {
        key: `native:${name}`,
        type: "native",
        id: name,
        title: label,
        iconMarkup: getNativeToolbarIcon(name, label),
        disabled: disabledNames.has(name),
      };
    });
    const customItems: SelectionToolbarPreviewItem[] = selectionToolbarCustomItems.value.map(item => ({
      key: `custom:${item.id}`,
      type: "custom",
      id: item.id,
      title: item.title || "未命名按钮",
      iconMarkup: renderSettingsIconMarkup(item),
      disabled: !item.visible,
      item,
    }));
    const defaultItems = [...nativeItems, ...customItems];
    const byKey = new Map(defaultItems.map(item => [item.key, item]));

    if (config.selectionToolbarLayout.length === 0) {
      return defaultItems;
    }

    const ordered: SelectionToolbarPreviewItem[] = [];
    const usedKeys = new Set<string>();
    for (const layoutItem of config.selectionToolbarLayout) {
      const key = createSelectionToolbarLayoutKey(layoutItem);
      const item = byKey.get(key);
      if (!item || usedKeys.has(key)) {
        continue;
      }
      ordered.push(item);
      usedKeys.add(key);
    }

    for (const item of defaultItems) {
      if (!usedKeys.has(item.key)) {
        ordered.push(item);
      }
    }

    return ordered;
  });

  /** 切换浮动工具栏原生按钮的禁用状态 */
  async function toggleSelectionToolbarNativeButton(name: string): Promise<void> {
    const index = config.disabledSelectionToolbarItems.findIndex(item => item.name === name);
    if (index >= 0) {
      config.disabledSelectionToolbarItems.splice(index, 1);
    } else {
      const label = NATIVE_TOOLBAR_BUTTON_LABELS[name] || name;
      config.disabledSelectionToolbarItems.push({ name, title: label });
    }
    await onPersist();
  }

  function onSelectionToolbarDragStart(event: DragEvent, item: PowerButtonItem): void {
    const localIndex = selectionToolbarCustomItems.value.findIndex(i => i.id === item.id);
    if (localIndex === -1) {
      return;
    }
    selectionToolbarDragIndex.value = localIndex;
    onPreviewDragStart(event, {
      id: item.id,
      itemId: item.id,
      title: item.title || "未命名按钮",
      visible: item.visible,
      surface: item.surface,
      order: item.order,
      editable: true,
      source: "config",
      iconMarkup: renderSettingsIconMarkup(item),
      draggable: true,
    });
  }

  function onSelectionToolbarDragEnd(): void {
    selectionToolbarDragIndex.value = null;
  }

  async function onSelectionToolbarDrop(localIndex: number): Promise<void> {
    const fromLocalIndex = selectionToolbarDragIndex.value;
    selectionToolbarDragIndex.value = null;

    // 内部重排序：在 selection-toolbar 项之间局部调整顺序
    if (fromLocalIndex !== null) {
      if (fromLocalIndex === localIndex) {
        previewDragItem.value = null;
        return;
      }

      const stItems = config.items.filter(item => item.surface === "selection-toolbar");
      const sorted = [...stItems].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(fromLocalIndex, 1);
      sorted.splice(localIndex, 0, moved);
      sorted.forEach((item, i) => { item.order = i; });

      const otherItems = config.items.filter(item => item.surface !== "selection-toolbar");
      config.items = [...otherItems, ...sorted];
      previewDragItem.value = null;
      await onPersist();
      return;
    }

    // 外部拖入：将项目移动到目标 selection-toolbar 位置
    if (previewDragItem.value) {
      await onPreviewSurfaceDrop("selection-toolbar", localIndex);
      return;
    }
  }

  function persistSelectionToolbarLayout(items: SelectionToolbarPreviewItem[]): void {
    config.selectionToolbarLayout = items.map(toSelectionToolbarLayoutItem);
    const customOrder = new Map(
      items
        .filter(item => item.type === "custom")
        .map((item, index) => [item.id, index]),
    );
    for (const item of config.items) {
      const order = customOrder.get(item.id);
      if (order !== undefined) {
        item.order = order;
      }
    }
  }

  function onSelectionToolbarPreviewDragStart(
    event: DragEvent,
    item: SelectionToolbarPreviewItem,
  ): void {
    const index = selectionToolbarPreviewItems.value.findIndex(entry => entry.key === item.key);
    if (index === -1) {
      return;
    }
    selectionToolbarPreviewDragIndex.value = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.key);
    }
  }

  async function onSelectionToolbarPreviewDrop(targetIndex: number): Promise<void> {
    const fromIndex = selectionToolbarPreviewDragIndex.value;
    selectionToolbarPreviewDragIndex.value = null;

    if (fromIndex !== null) {
      if (fromIndex === targetIndex) {
        return;
      }
      persistSelectionToolbarLayout(moveItem(selectionToolbarPreviewItems.value, fromIndex, targetIndex));
      await onPersist();
      return;
    }

    const dragItem = previewDragItem.value;
    if (!dragItem?.editable || !dragItem.itemId) {
      return;
    }

    const currentItems = selectionToolbarPreviewItems.value
      .filter(item => item.key !== `custom:${dragItem.itemId}`);
    const clampedIndex = Math.max(0, Math.min(targetIndex, currentItems.length));
    currentItems.splice(clampedIndex, 0, {
      key: `custom:${dragItem.itemId}`,
      type: "custom",
      id: dragItem.itemId,
      title: dragItem.title || "未命名按钮",
      iconMarkup: dragItem.iconMarkup || "",
      disabled: !dragItem.visible,
      item: config.items.find(item => item.id === dragItem.itemId),
    });

    const customTargetIndex = currentItems
      .slice(0, clampedIndex)
      .filter(item => item.type === "custom")
      .length;
    config.items = moveItem(config.items, dragItem.itemId, "selection-toolbar", customTargetIndex);
    persistSelectionToolbarLayout(currentItems);
    selectedId.value = dragItem.itemId;
    previewDragItem.value = null;
    await onPersist();
  }

  return {
    selectionToolbarNativeButtons,
    selectionToolbarCustomItems,
    selectionToolbarPreviewItems,
    toggleSelectionToolbarNativeButton,
    onSelectionToolbarDragStart,
    onSelectionToolbarDragEnd,
    onSelectionToolbarDrop,
    onSelectionToolbarPreviewDragStart,
    onSelectionToolbarPreviewDrop,
  };
}
