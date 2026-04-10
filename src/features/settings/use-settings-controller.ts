import {
  computed,
  reactive,
  ref,
  watch,
} from "vue";
import {
  createButtonItem,
  createDefaultConfig,
  importConfigFromJson,
} from "@/core/config";
import {
  BUILTIN_ICON_OPTIONS,
  COMMON_EMOJI_OPTIONS,
  filterBuiltinIcons,
} from "@/shared/icon-catalog";
import {
  captureShortcutFromKeyboardEvent,
  findExperimentalShortcutConflict,
} from "@/shared/shortcut-utils";
import { ACTION_TYPE_LABELS, SURFACE_LABELS } from "@/shared/constants";
import {
  buildPreviewLayout,
  movePreviewItem,
} from "@/shared/preview-layout";
import {
  triggerElementBySmartSelectors,
} from "@/core/commands";
import {
  ACTION_TYPES,
  CONFIGURABLE_SURFACES,
  ICON_TYPES,
} from "@/shared/types";
import {
  cloneConfig,
  moveItem,
  normalizeItemOrder,
} from "@/shared/utils";
import type {
  DisabledNativeButton,
  PowerButtonItem,
  PowerButtonsConfig,
  PreviewButtonItem,
  SurfaceType,
} from "@/shared/types";
import {
  applyActionTypeDefaults,
  applyIconTypeDefaults,
  createDefaultClickSequenceStep,
  ensureExperimentalClickSequenceConfig,
  ensureExperimentalShortcutConfig,
  ensureSelectedActionConfiguration,
  summarizeClickSequence,
} from "@/features/settings/action-config";
import {
  exportConfigFile,
  openImportFilePicker,
  readConfigFile,
} from "@/features/settings/file-transfer";
import type { SettingsAppProps } from "@/features/settings/types";
import {
  buildPreviewChipClass,
  getPreviewChipTitle,
  getSurfaceLabel,
  renderNamedIcon,
  renderPreviewIconMarkup,
  renderSettingsIconMarkup,
} from "@/features/settings/view-helpers";

function applyConfig(config: PowerButtonsConfig, nextConfig: PowerButtonsConfig): void {
  config.version = nextConfig.version;
  config.desktopOnly = nextConfig.desktopOnly;
  config.items = nextConfig.items;
  config.disabledNativeButtons = nextConfig.disabledNativeButtons;
  config.experimental = nextConfig.experimental;
}

function getPreviewInsertIndex(surfaceItems: PreviewButtonItem[], targetIndex: number): number {
  return surfaceItems.slice(0, targetIndex).filter(item => item.editable).length;
}

function normalizeSelectors(selectors: string[] | undefined): string[] {
  return Array.from(new Set((selectors || []).map(selector => selector.trim()).filter(Boolean)));
}

function isSameNativeButton(
  item: Pick<PreviewButtonItem, "id" | "surface" | "nativeSelectors">,
  suppressed: Pick<DisabledNativeButton, "id" | "surface" | "selectors">,
): boolean {
  if (item.id === suppressed.id) {
    return true;
  }

  if (item.surface !== suppressed.surface) {
    return false;
  }

  const itemSelectors = normalizeSelectors(item.nativeSelectors);
  const suppressedSelectors = normalizeSelectors(suppressed.selectors);

  return itemSelectors.some(selector => suppressedSelectors.includes(selector));
}

export function useSettingsController(props: SettingsAppProps) {
  const config = reactive<PowerButtonsConfig>(cloneConfig(props.initialConfig));
  const selectedId = ref(config.items[0]?.id || "");
  const listDragIndex = ref<number | null>(null);
  const previewDragItem = ref<PreviewButtonItem | null>(null);
  const runtimePreviewItems = ref<PreviewButtonItem[]>([]);
  const isRefreshingLayout = ref(false);
  const showPreviewLabels = ref(false);
  const importFileInput = ref<HTMLInputElement | null>(null);
  const iconKeyword = ref("");
  const shortcutCaptureError = ref("");

  const surfaces = CONFIGURABLE_SURFACES.map(value => ({
    value,
    label: SURFACE_LABELS[value],
  }));

  const actionTypes = ACTION_TYPES
    .filter(value => value !== "open-url")
    .map(value => ({
      value,
      label: ACTION_TYPE_LABELS[value],
    }));

  const iconTypes = ICON_TYPES.map(value => ({
    value,
    label: value === "builtin" ? "内置图标" : value === "emoji" ? "Emoji" : "SVG",
  }));
  const commonEmojiOptions = COMMON_EMOJI_OPTIONS;

  const builtinCommands = computed(() => props.builtinCommands);
  const pluginCommands = computed(() => props.pluginCommands);
  const selectedItem = computed<PowerButtonItem | undefined>(() => config.items.find(item => item.id === selectedId.value));

  const configPreviewItems = computed<PreviewButtonItem[]>(() => {
    return config.items.map(item => ({
      id: item.id,
      itemId: item.id,
      title: item.title || "未命名按钮",
      visible: item.visible,
      surface: item.surface,
      order: item.order + 1000,
      editable: true,
      source: "config",
      iconMarkup: renderSettingsIconMarkup(item),
      draggable: true,
    }));
  });

  const disabledNativePreviewItems = computed<PreviewButtonItem[]>(() => {
    return config.disabledNativeButtons.map((item, index) => ({
      id: item.id,
      title: item.title,
      visible: true,
      surface: item.surface,
      order: index,
      editable: false,
      source: "disabled-native",
      iconMarkup: item.iconMarkup,
      nativeSelectors: item.selectors,
      draggable: true,
      suppressed: true,
    }));
  });

  const activeRuntimePreviewItems = computed<PreviewButtonItem[]>(() => {
    return runtimePreviewItems.value
      .map(item => ({
        ...item,
        draggable: item.draggable ?? Boolean(item.nativeSelectors?.length),
      }))
      .filter(item => {
        if (!item.nativeSelectors?.length) {
          return true;
        }

        return !config.disabledNativeButtons.some(suppressed => isSameNativeButton(item, suppressed));
      });
  });

  const previewLayout = computed(() => {
    return buildPreviewLayout([...activeRuntimePreviewItems.value, ...configPreviewItems.value], { includeHidden: true });
  });

  const filteredBuiltinIcons = computed(() => {
    const result = filterBuiltinIcons(iconKeyword.value);
    return result.length ? result : BUILTIN_ICON_OPTIONS;
  });

  const selectedShortcutConflictMessage = computed(() => {
    if (!selectedItem.value || selectedItem.value.actionType !== "experimental-shortcut") {
      return "";
    }

    const shortcut = selectedItem.value.experimentalShortcut?.shortcut?.trim()
      || selectedItem.value.actionId.trim();
    if (!shortcut) {
      return "";
    }

    const conflict = findExperimentalShortcutConflict(config.items, selectedItem.value.id, shortcut);
    if (!conflict) {
      return "";
    }

    return `快捷键 ${shortcut} 已被按钮「${conflict.title || "未命名按钮"}」使用`;
  });

  const activeShortcutMessage = computed(() => shortcutCaptureError.value || selectedShortcutConflictMessage.value);

  async function refreshCurrentLayout(): Promise<void> {
    if (!props.onReadCurrentLayout || isRefreshingLayout.value) {
      return;
    }
    isRefreshingLayout.value = true;
    try {
      runtimePreviewItems.value = await props.onReadCurrentLayout();
    } catch (error) {
      props.onNotify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      isRefreshingLayout.value = false;
    }
  }

  async function persist(): Promise<void> {
    config.items = normalizeItemOrder(config.items);
    await props.onChange(cloneConfig(config));
    await refreshCurrentLayout();
  }

  async function addItem(): Promise<void> {
    const item = createButtonItem({
      title: `按钮 ${config.items.length + 1}`,
      order: config.items.length,
    });
    config.items.push(item);
    selectedId.value = item.id;
    await persist();
  }

  async function duplicateItem(): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const item = createButtonItem({
      ...selectedItem.value,
      id: undefined,
      title: `${selectedItem.value.title} 副本`,
      order: config.items.length,
    });
    config.items.push(item);
    selectedId.value = item.id;
    await persist();
  }

  async function removeItem(itemId: string): Promise<void> {
    const target = config.items.find(item => item.id === itemId);
    if (!target) {
      return;
    }
    const shouldRemove = window.confirm(`确定删除按钮「${target.title || "未命名按钮"}」吗？`);
    if (!shouldRemove) {
      return;
    }
    const index = config.items.findIndex(item => item.id === itemId);
    config.items.splice(index, 1);
    if (selectedId.value === itemId) {
      selectedId.value = config.items[0]?.id || "";
    }
    await persist();
  }

  async function resetConfig(): Promise<void> {
    if (!window.confirm("确定恢复默认按钮配置吗？")) {
      return;
    }
    applyConfig(config, createDefaultConfig());
    selectedId.value = config.items[0]?.id || "";
    await persist();
  }

  async function toggleVisible(itemId: string): Promise<void> {
    const target = config.items.find(item => item.id === itemId);
    if (!target) {
      return;
    }
    target.visible = !target.visible;
    await persist();
  }

  function selectItem(itemId: string): void {
    if (!config.items.some(item => item.id === itemId)) {
      return;
    }
    selectedId.value = itemId;
  }

  async function applyActionDefaults(): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    applyActionTypeDefaults(selectedItem.value, builtinCommands.value, pluginCommands.value);
    await persist();
  }

  async function selectIconType(value: PowerButtonItem["iconType"]): Promise<void> {
    if (!selectedItem.value || selectedItem.value.iconType === value) {
      return;
    }
    selectedItem.value.iconType = value;
    applyIconTypeDefaults(selectedItem.value);
    await persist();
  }

  async function selectBuiltinIcon(value: string): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    selectedItem.value.iconType = "builtin";
    selectedItem.value.iconValue = value;
    await persist();
  }

  async function selectEmojiIcon(value: string): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    selectedItem.value.iconType = "emoji";
    selectedItem.value.iconValue = value;
    await persist();
  }

  async function captureSelectedShortcut(event: KeyboardEvent): Promise<void> {
    if (!selectedItem.value || selectedItem.value.actionType !== "experimental-shortcut") {
      return;
    }

    const capture = captureShortcutFromKeyboardEvent(event);
    if (capture.kind === "ignore") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const shortcutConfig = ensureExperimentalShortcutConfig(selectedItem.value);
    shortcutCaptureError.value = "";

    if (capture.kind === "clear") {
      shortcutConfig.shortcut = "";
      selectedItem.value.actionId = "";
      await persist();
      return;
    }

    const conflict = findExperimentalShortcutConflict(config.items, selectedItem.value.id, capture.shortcut);
    if (conflict) {
      const message = `快捷键 ${capture.shortcut} 已被按钮「${conflict.title || "未命名按钮"}」使用`;
      shortcutCaptureError.value = message;
      props.onNotify(`${message}。`, "error");
      return;
    }

    shortcutConfig.shortcut = capture.shortcut;
    selectedItem.value.actionId = capture.shortcut;
    await persist();
  }

  async function syncExperimentalClickSequence(): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(selectedItem.value);
    selectedItem.value.actionId = summarizeClickSequence(clickSequence);
    await persist();
  }

  async function toggleSelectedShortcutOption(key: "sendEscapeBefore" | "allowDirectWindowDispatch"): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const shortcutConfig = ensureExperimentalShortcutConfig(selectedItem.value);
    shortcutConfig[key] = !shortcutConfig[key];
    selectedItem.value.actionId = shortcutConfig.shortcut.trim();
    await persist();
  }

  async function addClickSequenceStep(): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(selectedItem.value);
    clickSequence.steps.push(createDefaultClickSequenceStep());
    selectedItem.value.actionId = summarizeClickSequence(clickSequence);
    await persist();
  }

  async function removeClickSequenceStep(index: number): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(selectedItem.value);
    if (clickSequence.steps.length <= 1) {
      return;
    }
    clickSequence.steps.splice(index, 1);
    selectedItem.value.actionId = summarizeClickSequence(clickSequence);
    await persist();
  }

  async function toggleSelectedClickSequenceStopOnFailure(): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const clickSequence = ensureExperimentalClickSequenceConfig(selectedItem.value);
    clickSequence.stopOnFailure = !clickSequence.stopOnFailure;
    selectedItem.value.actionId = summarizeClickSequence(clickSequence);
    await persist();
  }

  function onListDragStart(index: number): void {
    listDragIndex.value = index;
  }

  async function onListDrop(index: number): Promise<void> {
    if (listDragIndex.value === null || listDragIndex.value === index) {
      return;
    }
    config.items = normalizeItemOrder(moveItem(config.items, listDragIndex.value, index));
    listDragIndex.value = null;
    await persist();
  }

  function onPreviewDragStart(event: DragEvent, item: PreviewButtonItem): void {
    if (!item.draggable && !item.editable) {
      return;
    }
    previewDragItem.value = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.itemId || item.id);
    }
  }

  async function moveFromPreview(surface: SurfaceType, targetIndex: number): Promise<void> {
    const dragItem = previewDragItem.value;
    if (!dragItem) {
      return;
    }

    if (!dragItem.editable || !dragItem.itemId) {
      if (dragItem.suppressed) {
        if (dragItem.surface !== surface) {
          props.onNotify("原生按钮只能拖回原来的区域以恢复显示。");
          previewDragItem.value = null;
          return;
        }
        config.disabledNativeButtons = config.disabledNativeButtons.filter(item => !isSameNativeButton(dragItem, item));
        previewDragItem.value = null;
        await persist();
        return;
      }

      props.onNotify("原生按钮只能拖到禁用栏。");
      previewDragItem.value = null;
      return;
    }

    if (!CONFIGURABLE_SURFACES.includes(surface as typeof CONFIGURABLE_SURFACES[number])) {
      props.onNotify("Dock 区域当前仅保留预览，不能放置快捷按钮。", "error");
      previewDragItem.value = null;
      return;
    }
    config.items = movePreviewItem(config.items, dragItem.itemId, surface, targetIndex);
    selectedId.value = dragItem.itemId;
    previewDragItem.value = null;
    await persist();
  }

  async function onPreviewItemDrop(
    surface: SurfaceType,
    surfaceItems: PreviewButtonItem[],
    targetIndex: number,
  ): Promise<void> {
    await moveFromPreview(surface, getPreviewInsertIndex(surfaceItems, targetIndex));
  }

  async function onPreviewSurfaceDrop(surface: SurfaceType): Promise<void> {
    await moveFromPreview(surface, config.items.filter(item => item.surface === surface).length);
  }

  async function onDisabledNativeDrop(): Promise<void> {
    const dragItem = previewDragItem.value;
    if (!dragItem) {
      return;
    }

    if (dragItem.editable) {
      props.onNotify("禁用栏仅用于隐藏原生按钮；自定义按钮请使用显示开关。");
      previewDragItem.value = null;
      return;
    }

    if (dragItem.suppressed || !dragItem.nativeSelectors?.length) {
      previewDragItem.value = null;
      return;
    }

    const selectors = normalizeSelectors(dragItem.nativeSelectors);
    const nextRule: DisabledNativeButton = {
      id: dragItem.id,
      title: dragItem.title,
      surface: dragItem.surface,
      selectors,
      iconMarkup: dragItem.iconMarkup,
    };

    config.disabledNativeButtons = [
      ...config.disabledNativeButtons.filter(item => !isSameNativeButton(dragItem, item)),
      nextRule,
    ];
    previewDragItem.value = null;
    await persist();
  }

  function handlePreviewChipClick(item: PreviewButtonItem): void {
    if (!item.editable || !item.itemId) {
      if (item.suppressed) {
        props.onNotify("该原生按钮已禁用；拖回原区域即可恢复显示。");
        return;
      }
      if (item.nativeSelectors?.length && triggerElementBySmartSelectors(item.nativeSelectors, document)) {
        return;
      }
      props.onNotify("原生按钮当前仅支持读取预览，暂不可直接编辑。");
      return;
    }
    selectedId.value = item.itemId;
  }

  function triggerExportConfigFile(): void {
    exportConfigFile(cloneConfig(config));
  }

  function triggerImportFilePicker(): void {
    openImportFilePicker(importFileInput.value);
  }

  async function handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    try {
      applyConfig(config, importConfigFromJson(await readConfigFile(file)));
      selectedId.value = config.items[0]?.id || "";
      await persist();
      props.onNotify("配置文件已导入。");
    } catch (error) {
      props.onNotify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      if (input) {
        input.value = "";
      }
    }
  }

  function renderBuiltinIconMarkup(item: Pick<PowerButtonItem, "iconType" | "iconValue">): string {
    return renderSettingsIconMarkup(item);
  }

  function renderBuiltinCatalogIcon(iconName: string): string {
    return renderNamedIcon(iconName);
  }

  function previewIconMarkup(item: PreviewButtonItem): string {
    return renderPreviewIconMarkup(item);
  }

  function previewChipClass(item: PreviewButtonItem): Record<string, boolean> {
    return buildPreviewChipClass(item, selectedId.value);
  }

  function previewChipTitle(item: PreviewButtonItem): string {
    return getPreviewChipTitle(item);
  }

  function surfaceLabel(value: string): string {
    return getSurfaceLabel(value);
  }

  watch(() => `${selectedId.value}:${selectedItem.value?.actionType || ""}`, () => {
    if (selectedItem.value) {
      ensureSelectedActionConfiguration(selectedItem.value);
    }
    shortcutCaptureError.value = "";
  }, { immediate: true, flush: "sync" });

  return {
    actionTypes,
    activeShortcutMessage,
    addClickSequenceStep,
    addItem,
    applyActionDefaults,
    builtinCommands,
    captureSelectedShortcut,
    commonEmojiOptions,
    config,
    duplicateItem,
    filteredBuiltinIcons,
    handleImportFile,
    handlePreviewChipClick,
    iconKeyword,
    iconTypes,
    importFileInput,
    initialize: refreshCurrentLayout,
    isRefreshingLayout,
    onListDragStart,
    onListDrop,
    onPreviewDragStart,
    onPreviewItemDrop,
    onPreviewSurfaceDrop,
    onDisabledNativeDrop,
    openImportFilePicker: triggerImportFilePicker,
    pluginCommands,
    disabledNativePreviewItems,
    previewChipClass,
    previewChipTitle,
    previewIconMarkup,
    previewLayout,
    removeClickSequenceStep,
    removeItem,
    renderNamedIcon: renderBuiltinCatalogIcon,
    renderBuiltinIconMarkup,
    resetConfig,
    selectedId,
    selectedItem,
    selectItem,
    selectBuiltinIcon,
    selectEmojiIcon,
    selectIconType,
    showPreviewLabels,
    surfaceLabel,
    surfaces,
    syncExperimentalClickSequence,
    toggleSelectedClickSequenceStopOnFailure,
    toggleSelectedShortcutOption,
    toggleVisible,
    exportConfigFile: triggerExportConfigFile,
  };
}
