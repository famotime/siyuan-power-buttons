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
  DEFAULT_BUILTIN_COMMAND_ID,
} from "@/core/config/item-defaults";
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
  formatExternalCommandActionId,
  parseExternalCommandActionId,
} from "@/core/commands";
import {
  ACTION_TYPES,
  CONFIGURABLE_SURFACES,
} from "@/shared/types";
import {
  cloneConfig,
  moveItem,
  normalizeItemOrder,
} from "@/shared/utils";
import type {
  PowerButtonItem,
  PowerButtonsConfig,
  PreviewButtonItem,
  SurfaceType,
} from "@/shared/types";
import {
  applyActionTypeDefaults,
  ensureSelectedActionConfiguration,
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
  getItemSurfacesLabel,
  getPreviewChipTitle,
  getSurfaceLabel,
  renderNamedIcon,
  renderPreviewIconMarkup,
  renderSettingsIconMarkup,
  resolveSvgPreviewState,
} from "@/features/settings/view-helpers";
import {
  getItemSurfaces,
  itemHasSurface,
  normalizeSurface,
} from "@/shared/surface-metadata";
import { useSettingsIcons } from "@/features/settings/controller/use-settings-icons";
import { useSettingsShortcuts } from "@/features/settings/controller/use-settings-shortcuts";
import { useSettingsToolbar } from "@/features/settings/controller/use-settings-toolbar";

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
  const customTitleIds = ref<Set<string>>(new Set(config.items.map(item => item.id)));
  const listDragIndex = ref<number | null>(null);
  const previewDragItem = ref<PreviewButtonItem | null>(null);
  const previewDragCleanup = ref<(() => void) | null>(null);
  const runtimePreviewItems = ref<PreviewButtonItem[]>([]);
  const externalCommandProviders = ref(props.externalCommandProviders || []);
  const isRefreshingLayout = ref(false);
  const showPreviewLabels = ref(false);
  const importFileInput = ref<HTMLInputElement | null>(null);

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

  function isTitleAutoUpdatable(item: PowerButtonItem | undefined): boolean {
    if (!item) {
      return false;
    }
    if (!customTitleIds.value.has(item.id)) {
      return true;
    }
    if (!item.title.trim()) {
      return true;
    }
    return false;
  }

  function resolveCurrentActionTitle(item: PowerButtonItem): string | undefined {
    if (item.actionType === "builtin-global-command") {
      const cmd = builtinCommands.value.find(c => c.id === item.actionId);
      return cmd?.title;
    }
    if (item.actionType === "plugin-command") {
      const parsed = parseExternalCommandActionId(item.actionId);
      if (parsed) {
        const provider = pluginCommandProviders.value.find(p => p.providerId === parsed.providerId);
        const cmd = provider?.commands.find(c => c.id === parsed.commandId);
        return cmd?.title;
      }
    }
    return undefined;
  }

  function syncActionTitleToButton(item: PowerButtonItem | undefined): void {
    if (!item || !isTitleAutoUpdatable(item)) {
      return;
    }
    const actionTitle = resolveCurrentActionTitle(item);
    if (actionTitle) {
      item.title = actionTitle;
    }
  }

  function handleTitleInput(): void {
    if (!selectedItem.value) {
      return;
    }
    const value = selectedItem.value.title;
    if (value && value.trim()) {
      customTitleIds.value.add(selectedItem.value.id);
    } else {
      customTitleIds.value.delete(selectedItem.value.id);
    }
  }

  async function handleTitleChange(): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    if (!selectedItem.value.title.trim()) {
      customTitleIds.value.delete(selectedItem.value.id);
      syncActionTitleToButton(selectedItem.value);
    }
    await persist();
  }

  const configPreviewItems = computed<PreviewButtonItem[]>(() => {
    return config.items.map(item => ({
      id: item.id,
      itemId: item.id,
      title: item.title || "未命名按钮",
      visible: item.visible,
      surface: item.surface,
      surfaces: getItemSurfaces(item),
      order: item.order + 1000,
      editable: true,
      source: "config",
      iconMarkup: renderSettingsIconMarkup(item),
      draggable: true,
    }));
  });

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
    const defaultActionTitle = builtinCommands.value.find(c => c.id === DEFAULT_BUILTIN_COMMAND_ID)?.title || "最近文档";
    const item = createButtonItem({
      title: defaultActionTitle,
      order: config.items.length,
    });
    config.items.push(item);
    selectedId.value = item.id;
    // 新建按钮不加入 customTitleIds，保持默认名称状态随动作设置变化
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
    customTitleIds.value.add(item.id);
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
    customTitleIds.value.delete(itemId);
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
    customTitleIds.value = new Set(config.items.map(item => item.id));
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

  async function setSelectedBuiltinCommand(commandId: string): Promise<void> {
    if (!selectedItem.value || selectedItem.value.actionType !== "builtin-global-command") {
      return;
    }
    selectedItem.value.actionId = commandId;
    syncActionTitleToButton(selectedItem.value);
    await persist();
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

    syncActionTitleToButton(selectedItem.value);

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
    syncActionTitleToButton(selectedItem.value);
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
    syncActionTitleToButton(selectedItem.value);
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
    syncActionTitleToButton(selectedItem.value);
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

  // 使用拆分出的 composable
  const icons = useSettingsIcons({
    selectedItem: () => selectedItem.value,
    onPersist: persist,
  });

  const shortcuts = useSettingsShortcuts({
    config,
    selectedItem: () => selectedItem.value,
    onPersist: persist,
    onNotify: props.onNotify,
  });

  const toolbar = useSettingsToolbar({
    config,
    onPersist: persist,
    onPreviewDragStart,
    onPreviewSurfaceDrop,
    previewDragItem,
    selectedId,
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
      customTitleIds.value = new Set(config.items.map(item => item.id));
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

  function itemSurfacesLabel(item: PowerButtonItem): string {
    return getItemSurfacesLabel(item);
  }

  function isSurfaceSelected(surfaceValue: string): boolean {
    if (!selectedItem.value) {
      return false;
    }
    return itemHasSurface(selectedItem.value, surfaceValue);
  }

  async function toggleSurface(surfaceValue: string): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const target = normalizeSurface(surfaceValue);
    const current = getItemSurfaces(selectedItem.value);
    let next: SurfaceType[];
    if (current.includes(target)) {
      if (current.length <= 1) {
        props.onNotify?.("至少需要保留一个显示位置", "info");
        return;
      }
      next = current.filter(s => s !== target);
    } else {
      next = [...current, target];
    }
    selectedItem.value.surfaces = next;
    selectedItem.value.surface = next[0];
    await persist();
  }

  async function handleSingleSurfaceSelect(surfaceValue: string): Promise<void> {
    if (!selectedItem.value) {
      return;
    }
    const target = normalizeSurface(surfaceValue);
    selectedItem.value.surfaces = [target];
    selectedItem.value.surface = target;
    await persist();
  }

  watch(() => `${selectedId.value}:${selectedItem.value?.actionType || ""}`, () => {
    if (selectedItem.value) {
      ensureSelectedActionConfiguration(selectedItem.value);
    }
    shortcuts.shortcutCaptureError.value = "";
  }, { immediate: true, flush: "sync" });

  watch(selectedId, (value) => {
    if (!props.onSelectedIdChange) {
      return;
    }

    void Promise.resolve(props.onSelectedIdChange(value)).catch(() => undefined);
  }, { immediate: true, flush: "sync" });

  return {
    actionTypes,
    activeShortcutMessage: shortcuts.activeShortcutMessage,
    addClickSequenceStep: shortcuts.addClickSequenceStep,
    addItem,
    applyActionDefaults,
    builtinCommands,
    captureSelectedShortcut: shortcuts.captureSelectedShortcut,
    commonEmojiOptions: icons.commonEmojiOptions,
    config,
    duplicateItem,
    filteredIconParkIcons: icons.filteredIconParkIcons,
    handleImportFile,
    handlePreviewChipClick,
    handleTitleChange,
    handleTitleInput,
    iconCategory: icons.iconCategory,
    iconKeyword: icons.iconKeyword,
    iconParkCategories: icons.iconParkCategories,
    iconTypes: icons.iconTypes,
    importFileInput,
    initialize: refreshCurrentLayout,
    refreshCurrentLayout,
    isRefreshingLayout,
    onListDragStart,
    onListDrop,
    onSelectionToolbarDragStart: toolbar.onSelectionToolbarDragStart,
    onSelectionToolbarDragEnd: toolbar.onSelectionToolbarDragEnd,
    onSelectionToolbarDrop: toolbar.onSelectionToolbarDrop,
    onSelectionToolbarPreviewDragStart: toolbar.onSelectionToolbarPreviewDragStart,
    onSelectionToolbarPreviewDrop: toolbar.onSelectionToolbarPreviewDrop,
    onPreviewDragStart,
    onPreviewItemDrop,
    onPreviewSurfaceDrop,
    openImportFilePicker: triggerImportFilePicker,
    persist,
    pluginCommands,
    selectionToolbarNativeButtons: toolbar.selectionToolbarNativeButtons,
    selectionToolbarCustomItems: toolbar.selectionToolbarCustomItems,
    selectionToolbarPreviewItems: toolbar.selectionToolbarPreviewItems,
    toggleSelectionToolbarNativeButton: toolbar.toggleSelectionToolbarNativeButton,
    externalCommandProviders,
    pluginCommandProviders,
    previewChipClass,
    previewChipTitle,
    previewIconMarkup,
    previewLayout,
    removeClickSequenceStep: shortcuts.removeClickSequenceStep,
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
    setSelectedBuiltinCommand,
    setSelectedPluginCommand,
    setSelectedPluginProvider,
    selectIconParkIcon: icons.selectIconParkIcon,
    selectEmojiIcon: icons.selectEmojiIcon,
    selectIconType: icons.selectIconType,
    showPreviewLabels,
    surfaceLabel,
    surfaces,
    isSurfaceSelected,
    toggleSurface,
    handleSingleSurfaceSelect,
    itemSurfacesLabel,
    syncExperimentalClickSequence: shortcuts.syncExperimentalClickSequence,
    syncExperimentalShortcut: shortcuts.syncExperimentalShortcut,
    toggleSelectedClickSequenceStopOnFailure: shortcuts.toggleSelectedClickSequenceStopOnFailure,
    toggleSelectedShortcutOption: shortcuts.toggleSelectedShortcutOption,
    toggleVisible,
    exportConfigFile: triggerExportConfigFile,
  };
}
