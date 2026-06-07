import {
  computed,
  reactive,
  ref,
  watch,
} from "vue";
import {
  createDefaultConfig,
  createButtonItem,
  importConfigFromJson,
  mergeImportedButtonsWithStats,
} from "@/core/config";
import {
  COMMON_EMOJI_OPTIONS,
  filterIconParkIcons,
  getIconParkCategories,
} from "@/shared/icon-catalog";
import {
  captureShortcutFromKeyboardEvent,
  findExperimentalShortcutConflict,
} from "@/shared/shortcut-utils";
import {
  ACTION_TYPE_LABELS,
  INTERNAL_PLUGIN_PROVIDER_ID,
  INTERNAL_PLUGIN_PROVIDER_NAME,
  SURFACE_LABELS,
} from "@/shared/constants";
import {
  buildPreviewLayout,
  movePreviewItem,
} from "@/shared/preview-layout";
import {
  NATIVE_TOOLBAR_BUTTON_LABELS,
  CONFIGURABLE_NATIVE_NAMES,
} from "@/core/surfaces/selection-toolbar-manager";
import {
  formatExternalCommandActionId,
  parseExternalCommandActionId,
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
  SelectionToolbarLayoutItem,
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
import type { SettingsPluginCommandProvider } from "@/features/settings/types";
import {
  buildPluginCommandProviders,
  findSelectedPluginCommand,
  findSelectedPluginProvider,
  hasValidPluginCommandSelection,
} from "@/features/settings/controller/plugin-command";
import {
  isSameNativeButton,
  usePreviewInteractions,
} from "@/features/settings/controller/preview-interactions";
import {
  buildPreviewChipClass,
  getPreviewChipTitle,
  getSurfaceLabel,
  renderNamedIcon,
  renderPreviewIconMarkup,
  renderSettingsIconMarkup,
  resolveSvgPreviewState,
} from "@/features/settings/view-helpers";
import { getNativeToolbarIcon } from "@/shared/native-icon";

function applyConfig(config: PowerButtonsConfig, nextConfig: PowerButtonsConfig): void {
  config.version = nextConfig.version;
  config.desktopOnly = nextConfig.desktopOnly;
  config.items = nextConfig.items;
  config.disabledNativeButtons = nextConfig.disabledNativeButtons;
  config.disabledSelectionToolbarItems = nextConfig.disabledSelectionToolbarItems;
  config.selectionToolbarLayout = nextConfig.selectionToolbarLayout;
  config.experimental = nextConfig.experimental;
}

function resolveInitialSelectedId(config: PowerButtonsConfig, initialSelectedButtonId?: string): string {
  if (initialSelectedButtonId && config.items.some(item => item.id === initialSelectedButtonId)) {
    return initialSelectedButtonId;
  }

  return config.items[0]?.id || "";
}

export function useSettingsController(props: SettingsAppProps) {
  const config = reactive<PowerButtonsConfig>(cloneConfig(props.initialConfig));
  const selectedId = ref(resolveInitialSelectedId(config, props.initialSelectedButtonId));
  const listDragIndex = ref<number | null>(null);
  const selectionToolbarDragIndex = ref<number | null>(null);
  const selectionToolbarPreviewDragIndex = ref<number | null>(null);
  const previewDragItem = ref<PreviewButtonItem | null>(null);
  const previewDragCleanup = ref<(() => void) | null>(null);
  const runtimePreviewItems = ref<PreviewButtonItem[]>([]);
  const externalCommandProviders = ref(props.externalCommandProviders || []);
  const isRefreshingLayout = ref(false);
  const showPreviewLabels = ref(false);
  const importFileInput = ref<HTMLInputElement | null>(null);
  const iconKeyword = ref("");
  const iconCategory = ref("");
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
    label: value === "iconpark" ? "IconPark" : value === "emoji" ? "Emoji" : "SVG",
  }));
  const iconParkCategories = computed(() => getIconParkCategories());
  const commonEmojiOptions = COMMON_EMOJI_OPTIONS;

  const builtinCommands = computed(() => props.builtinCommands);
  const pluginCommands = computed(() => props.pluginCommands);
  const pluginCommandProviders = computed<SettingsPluginCommandProvider[]>(() => {
    return buildPluginCommandProviders(pluginCommands.value, externalCommandProviders.value);
  });
  const selectedItem = computed<PowerButtonItem | undefined>(() => config.items.find(item => item.id === selectedId.value));
  const selectedPluginProvider = computed(() => {
    return findSelectedPluginProvider(selectedItem.value, pluginCommandProviders.value);
  });
  const selectedPluginCommand = computed(() => {
    return findSelectedPluginCommand(selectedItem.value, selectedPluginProvider.value);
  });

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

  type SelectionToolbarPreviewItem = {
    key: string;
    type: "native" | "custom";
    id: string;
    title: string;
    iconMarkup: string;
    disabled: boolean;
    item?: PowerButtonItem;
  };

  function createSelectionToolbarLayoutKey(item: SelectionToolbarLayoutItem): string {
    return `${item.type}:${item.id}`;
  }

  function toSelectionToolbarLayoutItem(item: SelectionToolbarPreviewItem): SelectionToolbarLayoutItem {
    return {
      type: item.type,
      id: item.id,
    };
  }

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
    await persist();
  }

  const activeRuntimePreviewItems = computed<PreviewButtonItem[]>(() => {
    const runtime = runtimePreviewItems.value.map(item => ({
      ...item,
      draggable: item.draggable ?? Boolean(item.nativeSelectors?.length),
      suppressed: item.nativeSelectors?.length
        ? config.disabledNativeButtons.some(suppressed => isSameNativeButton(item, suppressed))
        : false,
    }));

    // 补回被 native-element-suppressor 从 DOM 中隐藏、导致快照丢失的禁用项
    const runtimeIds = new Set(runtime.map(item => item.id));
    for (const rule of config.disabledNativeButtons) {
      if (!runtimeIds.has(rule.id) && !runtime.some(item => isSameNativeButton(item, rule))) {
        runtime.push({
          id: rule.id,
          title: rule.title,
          visible: true,
          surface: rule.surface,
          order: 9999,
          editable: false,
          source: "native",
          iconMarkup: rule.iconMarkup,
          nativeSelectors: rule.selectors,
          draggable: true,
          suppressed: true,
        });
      }
    }

    return runtime;
  });

  const previewLayout = computed(() => {
    return buildPreviewLayout([...activeRuntimePreviewItems.value, ...configPreviewItems.value], { includeHidden: true });
  });

  const filteredIconParkIcons = computed(() => {
    const result = filterIconParkIcons(iconKeyword.value, iconCategory.value);
    return result.length ? result : filterIconParkIcons("", iconCategory.value);
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
    applyActionTypeDefaults(
      selectedItem.value,
      builtinCommands.value,
      pluginCommands.value,
      externalCommandProviders.value,
    );

    if (selectedItem.value.actionType === "plugin-command") {
      if (externalCommandProviders.value.length === 0 && props.onRefreshExternalCommands) {
        externalCommandProviders.value = await props.onRefreshExternalCommands();
      }

      if (!hasValidPluginCommandSelection(selectedItem.value.actionId, pluginCommandProviders.value)) {
        applyActionTypeDefaults(
          selectedItem.value,
          builtinCommands.value,
          pluginCommands.value,
          externalCommandProviders.value,
        );
      }
    }

    await persist();
  }

  async function refreshExternalProviders(): Promise<void> {
    if (!props.onRefreshExternalCommands) {
      return;
    }

    externalCommandProviders.value = await props.onRefreshExternalCommands();

    if (!selectedItem.value || selectedItem.value.actionType !== "plugin-command") {
      return;
    }

    if (hasValidPluginCommandSelection(selectedItem.value.actionId, pluginCommandProviders.value)) {
      return;
    }

    applyActionTypeDefaults(
      selectedItem.value,
      builtinCommands.value,
      pluginCommands.value,
      externalCommandProviders.value,
    );
    await persist();
  }

  async function setSelectedPluginProvider(providerId: string): Promise<void> {
    if (!selectedItem.value || selectedItem.value.actionType !== "plugin-command") {
      return;
    }

    const provider = pluginCommandProviders.value.find(item => item.providerId === providerId);
    const commandId = provider?.commands[0]?.id;
    selectedItem.value.actionId = provider && commandId
      ? formatExternalCommandActionId(provider.providerId, commandId)
      : formatExternalCommandActionId(providerId, "__unset__");
    await persist();
  }

  async function setSelectedPluginCommand(commandId: string): Promise<void> {
    if (!selectedItem.value || selectedItem.value.actionType !== "plugin-command") {
      return;
    }

    const parsed = parseExternalCommandActionId(selectedItem.value.actionId);
    if (!parsed) {
      return;
    }

    selectedItem.value.actionId = formatExternalCommandActionId(parsed.providerId, commandId);
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

  async function selectIconParkIcon(value: string): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    selectedItem.value.iconType = "iconpark";
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

  async function syncExperimentalShortcut(): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const shortcutConfig = ensureExperimentalShortcutConfig(selectedItem.value);
    selectedItem.value.actionId = shortcutConfig.shortcut.trim();
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
      await persist();
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
      await persist();
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
    config.items = movePreviewItem(config.items, dragItem.itemId, "selection-toolbar", customTargetIndex);
    persistSelectionToolbarLayout(currentItems);
    selectedId.value = dragItem.itemId;
    previewDragItem.value = null;
    previewDragCleanup.value?.();
    previewDragCleanup.value = null;
    await persist();
  }
  const {
    handlePreviewChipClick,
    onPreviewDragStart,
    onPreviewItemDrop,
    onPreviewSurfaceDrop,
  } = usePreviewInteractions({
    config,
    selectedId,
    previewDragItem,
    previewDragCleanup,
    persist,
    notify: props.onNotify,
  });

  function triggerExportConfigFile(): void {
    exportConfigFile(cloneConfig(config));
  }

  function triggerImportFilePicker(): void {
    openImportFilePicker(importFileInput.value);
  }

  function setImportFileInput(element: HTMLInputElement | null): void {
    importFileInput.value = element;
  }

  async function handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    try {
      const mergeResult = mergeImportedButtonsWithStats(
        config,
        importConfigFromJson(await readConfigFile(file)),
      );
      applyConfig(config, mergeResult.config);
      selectedId.value = config.items[0]?.id || "";
      await persist();
      props.onNotify(`已导入 ${mergeResult.importedCount} 个新按钮，跳过 ${mergeResult.skippedCount} 个已存在按钮。`);
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

  function renderSvgPreviewState(item: Pick<PowerButtonItem, "iconType" | "iconValue">) {
    return resolveSvgPreviewState(item);
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

  watch(selectedId, (value) => {
    if (!props.onSelectedIdChange) {
      return;
    }

    void Promise.resolve(props.onSelectedIdChange(value)).catch(() => undefined);
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
    filteredIconParkIcons,
    handleImportFile,
    handlePreviewChipClick,
    iconCategory,
    iconKeyword,
    iconParkCategories,
    iconTypes,
    importFileInput,
    initialize: refreshCurrentLayout,
    refreshCurrentLayout,
    isRefreshingLayout,
    onListDragStart,
    onListDrop,
    onSelectionToolbarDragStart,
    onSelectionToolbarDragEnd,
    onSelectionToolbarDrop,
    onSelectionToolbarPreviewDragStart,
    onSelectionToolbarPreviewDrop,
    onPreviewDragStart,
    onPreviewItemDrop,
    onPreviewSurfaceDrop,
    openImportFilePicker: triggerImportFilePicker,
    persist,
    pluginCommands,
    selectionToolbarNativeButtons,
    selectionToolbarCustomItems,
    selectionToolbarPreviewItems,
    toggleSelectionToolbarNativeButton,
    externalCommandProviders,
    pluginCommandProviders,
    previewChipClass,
    previewChipTitle,
    previewIconMarkup,
    previewLayout,
    removeClickSequenceStep,
    removeItem,
    renderNamedIcon: renderBuiltinCatalogIcon,
    renderBuiltinIconMarkup,
    renderSvgPreviewState,
    resetConfig,
    refreshExternalProviders,
    setImportFileInput,
    selectedId,
    selectedPluginCommand,
    selectedPluginProvider,
    selectedItem,
    selectItem,
    setSelectedPluginCommand,
    setSelectedPluginProvider,
    selectIconParkIcon,
    selectEmojiIcon,
    selectIconType,
    showPreviewLabels,
    surfaceLabel,
    surfaces,
    syncExperimentalClickSequence,
    syncExperimentalShortcut,
    toggleSelectedClickSequenceStopOnFailure,
    toggleSelectedShortcutOption,
    toggleVisible,
    exportConfigFile: triggerExportConfigFile,
  };
}
