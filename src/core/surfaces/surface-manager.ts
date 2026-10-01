import type {
  Plugin,
} from "siyuan";
import { CommandExecutor } from "@/core/commands";
import { DEFAULT_PLUGIN_COMMAND } from "@/shared/constants";
import {
  getDockPosition,
  getItemSurfaces,
  isDockSurface,
  isStatusBarSurface,
  itemHasSurface,
} from "@/shared/surface-metadata";
import {
  sortItems,
} from "@/shared/utils";
import type {
  PowerButtonItem,
  PowerButtonsConfig,
  SelectionToolbarLayoutItem,
  SurfaceType,
} from "@/shared/types";
import { confirmDialog, promptDialog } from "@/core/surfaces/dialog-utils";
import { findCanvasMountTarget } from "@/core/surfaces/canvas-mount-target";
import { NativeElementSuppressor } from "@/core/surfaces/native-element-suppressor";
import {
  createCanvasElement,
  createDockPanel,
  createFixedSettingsTopbar,
  createStatusElement,
  type DockPanelEntry,
  type DockRegistration,
  getIconMarkup,
  hasDockRemove,
  renderStandaloneDockPanel,
} from "@/core/surfaces/surface-elements";

export const STANDALONE_DOCK_TYPE = "siyuan-power-buttons-dock-panel";
export const STANDALONE_DOCK_ICON_SYMBOL = "iconPowerButtonsDock";

const ASTERISK_KEY_SYMBOL_SVG = `<svg style="display:none;" id="siyuan-power-buttons-symbols"><symbol id="${STANDALONE_DOCK_ICON_SYMBOL}" viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 16V32" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.447 19.4114L30.5535 28.5886" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M30.5532 19.4114L17.4468 28.5886" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></symbol></svg>`;

function getOrderedSurfaceButtons(config: PowerButtonsConfig, surface: SurfaceType): PowerButtonItem[] {
  const visibleButtons = config.items.filter(item => itemHasSurface(item, surface) && item.visible);
  const layout = config.surfaceLayouts?.[surface];
  if (!layout) {
    return sortItems(visibleButtons);
  }
  const buttonMap = new Map<string, PowerButtonItem>(visibleButtons.map(item => [item.id, item]));
  const ordered: PowerButtonItem[] = [];
  const usedIds = new Set<string>();

  for (const entry of layout) {
    if (entry.type === "button") {
      const item = buttonMap.get(entry.id);
      if (item) {
        ordered.push(item);
        usedIds.add(entry.id);
      }
    }
  }

  for (const item of sortItems(visibleButtons)) {
    if (!usedIds.has(item.id)) {
      ordered.push(item);
    }
  }

  return ordered;
}

export class SurfaceManager {
  private topbarElements: HTMLElement[] = [];
  private statusElements: HTMLElement[] = [];
  private canvasElements: HTMLElement[] = [];
  private dockRegistrations: DockRegistration[] = [];
  private standaloneDockRegistration: DockRegistration | null = null;
  private standaloneDockHost: HTMLElement | null = null;
  private currentConfig: PowerButtonsConfig | null = null;
  private nativeSuppressor = new NativeElementSuppressor();
  private toolbarPatchObserver: MutationObserver | null = null;
  private disabledToolbarNames = new Set<string>();
  private patchedToolbarItems = new Set<HTMLElement>();
  private customToolbarItems: PowerButtonItem[] = [];
  private selectionToolbarLayout: SelectionToolbarLayoutItem[] = [];
  private injectedToolbarItems = new Set<HTMLElement>();

  constructor(
    private readonly plugin: Plugin,
    private readonly executor: CommandExecutor,
    private readonly onSaveConfig?: (config: PowerButtonsConfig) => Promise<void> | void,
  ) {}

  render(config: PowerButtonsConfig): void {
    this.currentConfig = config;
    this.clearDynamicSurfaces();

    this.ensureStandaloneDock();
    this.renderStandaloneDock();

    this.topbarElements.push(createFixedSettingsTopbar(this.plugin, this.executor));

    // 1. 顶栏按钮
    for (const item of getOrderedSurfaceButtons(config, "topbar")) {
      if (itemHasSurface(item, "topbar")) {
        const element = this.plugin.addTopBar({
          icon: item.iconType === "iconpark" ? getIconMarkup(item) : getIconMarkup(item),
          title: item.tooltip || item.title,
          callback: () => {
            void this.executor.execute(item);
          },
        });
        element.dataset.powerButtonsOwned = "true";
        element.dataset.powerButtonsItemId = item.id;
        this.topbarElements.push(element);
      }
    }

    // 2. 状态栏按钮（合并为状态栏，默认为右侧）
    for (const item of getOrderedSurfaceButtons(config, "statusbar-right")) {
      const element = this.plugin.addStatusBar({
        element: createStatusElement(item, this.executor),
        position: "right",
      });
      this.statusElements.push(element);
    }

    // 3. 编辑区按钮
    const canvasMount = findCanvasMountTarget(document);
    if (canvasMount) {
      for (const item of getOrderedSurfaceButtons(config, "canvas")) {
        const element = createCanvasElement(item, this.executor, canvasMount.kind);
        if (canvasMount.anchor) {
          canvasMount.container.insertBefore(element, canvasMount.anchor);
        } else {
          canvasMount.container.appendChild(element);
        }
        this.canvasElements.push(element);
      }
    }

    // 4. 单独 Dock 按钮
    const visibleItems = sortItems(config.items).filter(item => item.visible);
    for (const item of visibleItems) {
      for (const surface of getItemSurfaces(item)) {
        if (isDockSurface(surface)) {
          const type = `siyuan-power-buttons-${item.id}-${surface}`;
          const registration = this.plugin.addDock({
            type,
            data: {
              itemId: item.id,
            },
            config: {
              position: getDockPosition(surface),
              size: surface.startsWith("dock-bottom")
                ? { width: null, height: 220 }
                : { width: 280, height: null },
              icon: getIconMarkup(item),
              title: item.title,
              index: item.order,
              show: true,
            },
            init: dock => {
              createDockPanel(item, this.executor, dock.element);
            },
          });
          if (registration) {
            this.dockRegistrations.push({
              type,
              model: registration.model,
            });
          }
        }
      }
    }

    this.nativeSuppressor.apply(config.disabledNativeButtons, document);

    // 禁用浮动工具栏原生按钮
    this.disabledToolbarNames = new Set(
      config.disabledSelectionToolbarItems.map(item => item.name),
    );
    // 缓存浮动工具栏自定义按钮，供 DOM 注入使用
    this.customToolbarItems = config.items
      .filter(item => itemHasSurface(item, "selection-toolbar") && item.visible)
      .sort((a, b) => a.order - b.order);
    this.selectionToolbarLayout = config.selectionToolbarLayout;
    this.patchSelectionToolbar();
  }

  /**
   * 直接 patch 浮动工具栏 DOM：
   * 1. 隐藏被禁用的原生按钮
   * 2. 注入自定义按钮（如果尚未存在）
   *
   * siyuan 的 updateProtyleToolbar 仅在 protyle 初始化时调用一次，
   * 已打开的编辑器不会因配置变更而刷新。此方法通过 DOM 操作弥补。
   */
  private patchSelectionToolbar(): void {
    this.toolbarPatchObserver?.disconnect();
    this.toolbarPatchObserver = null;
    this.restoreToolbarPatch();

    const needsPatch = this.disabledToolbarNames.size > 0
      || this.customToolbarItems.length > 0
      || this.selectionToolbarLayout.length > 0;
    if (!needsPatch) {
      return;
    }

    this.applyToolbarPatch();

    // protyle-toolbar 是浮动元素，挂载在 body 下而非 .layout__center 内部
    this.toolbarPatchObserver = new MutationObserver(() => {
      this.applyToolbarPatch();
    });
    this.toolbarPatchObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private applyToolbarPatch(): void {
    const needsNativePatch = this.disabledToolbarNames.size > 0;
    const needsCustomInject = this.customToolbarItems.length > 0;

    for (const toolbar of document.querySelectorAll<HTMLElement>(".protyle-toolbar")) {
      // 隐藏被禁用的原生按钮
      if (needsNativePatch) {
        for (const item of toolbar.querySelectorAll<HTMLElement>("[data-type]")) {
          const type = item.dataset.type;
          if (!type || !this.disabledToolbarNames.has(type)) continue;
          if (this.patchedToolbarItems.has(item)) continue;
          item.style.display = "none";
          this.patchedToolbarItems.add(item);
        }
      }

      // 注入自定义按钮（如果尚未存在）
      // 同时检查 data-power-buttons-item-id（DOM 注入）和 data-type（updateProtyleToolbar hook 注入）
      // 因为 IMenuItem.name 在 SiYuan 中渲染为 data-type 属性
      if (needsCustomInject) {
        for (const config of this.customToolbarItems) {
          const selector = `[data-power-buttons-item-id="${config.id}"], [data-type="power-buttons:${config.id}"]`;
          if (toolbar.querySelector(selector)) continue;
          const element = this.createCustomToolbarButton(config);
          this.injectedToolbarItems.add(element);
          toolbar.appendChild(element);
        }
      }

      if (this.selectionToolbarLayout.length > 0) {
        this.sortSelectionToolbar(toolbar);
      }
    }
  }

  private sortSelectionToolbar(toolbar: HTMLElement): void {
    const itemEntries = Array.from(toolbar.children)
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map(element => ({
        element,
        key: this.getSelectionToolbarElementKey(element),
      }));
    const byKey = new Map<string, HTMLElement>();
    const originalKeys: string[] = [];

    for (const entry of itemEntries) {
      if (!entry.key) {
        continue;
      }
      byKey.set(entry.key, entry.element);
      originalKeys.push(entry.key);
    }

    const ordered: HTMLElement[] = [];
    const usedKeys = new Set<string>();
    for (const item of this.selectionToolbarLayout) {
      const key = `${item.type}:${item.id}`;
      const element = byKey.get(key);
      if (!element || usedKeys.has(key)) {
        continue;
      }
      ordered.push(element);
      usedKeys.add(key);
    }

    for (const key of originalKeys) {
      const element = byKey.get(key);
      if (!element || usedKeys.has(key)) {
        continue;
      }
      ordered.push(element);
      usedKeys.add(key);
    }

    const currentOrderedElements = itemEntries
      .filter(entry => Boolean(entry.key))
      .map(entry => entry.element);
    if (
      currentOrderedElements.length === ordered.length
      && currentOrderedElements.every((element, index) => element === ordered[index])
    ) {
      return;
    }

    for (const element of ordered) {
      toolbar.appendChild(element);
    }
  }

  private getSelectionToolbarElementKey(element: HTMLElement): string | null {
    const customId = element.dataset.powerButtonsItemId
      || element.dataset.type?.replace(/^power-buttons:/, "");
    if (customId && element.dataset.type?.startsWith("power-buttons:")) {
      return `custom:${customId}`;
    }

    const nativeType = element.dataset.type;
    if (nativeType && !nativeType.startsWith("power-buttons:")) {
      return `native:${nativeType}`;
    }

    return null;
  }

  /**
   * 恢复所有被 patch 过的工具栏按钮的显示状态，
   * 并移除所有自定义按钮（包括 DOM 注入和 updateProtyleToolbar hook 注入的）。
   */
  private restoreToolbarPatch(): void {
    for (const item of this.patchedToolbarItems) {
      item.style.display = "";
    }
    this.patchedToolbarItems.clear();

    // 移除所有自定义按钮——同时处理 DOM 注入和 hook 注入两种来源
    // hook 注入的按钮通过 SiYuan 渲染为 data-type="power-buttons:xxx"
    // DOM 注入的按钮同时拥有 data-power-buttons-owned 和 data-type
    for (const toolbar of document.querySelectorAll<HTMLElement>(".protyle-toolbar")) {
      const customButtons = toolbar.querySelectorAll<HTMLElement>(
        'button[data-type^="power-buttons:"]',
      );
      for (const btn of customButtons) {
        btn.remove();
      }
    }
    this.injectedToolbarItems.clear();
  }

  private createCustomToolbarButton(config: PowerButtonItem): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "protyle-toolbar__item b3-tooltips b3-tooltips__n";
    button.setAttribute("aria-label", config.tooltip || config.title);
    button.dataset.powerButtonsOwned = "true";
    button.dataset.powerButtonsItemId = config.id;
    // 同时设置 data-type，与 updateProtyleToolbar hook 注入的按钮保持一致
    button.dataset.type = `power-buttons:${config.id}`;
    button.innerHTML = getIconMarkup(config);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.executor.execute(config);
    });
    return button;
  }

  private ensureStandaloneDock(): void {
    if (this.standaloneDockRegistration) {
      return;
    }

    const pluginWithAddIcons = this.plugin as Plugin & { addIcons?: (svg: string) => void };
    if (typeof pluginWithAddIcons.addIcons === "function") {
      pluginWithAddIcons.addIcons(ASTERISK_KEY_SYMBOL_SVG);
    } else if (typeof document !== "undefined" && !document.getElementById("siyuan-power-buttons-symbols")) {
      document.body.insertAdjacentHTML("afterbegin", ASTERISK_KEY_SYMBOL_SVG);
    }

    const title = this.t("dockPanelTitle", "随心按");
    const registration = this.plugin.addDock({
      type: STANDALONE_DOCK_TYPE,
      data: {},
      config: {
        position: "RightTop",
        size: { width: 320, height: null },
        icon: STANDALONE_DOCK_ICON_SYMBOL,
        title,
        index: 0,
        show: true,
      },
      init: dock => {
        this.standaloneDockHost = dock.element;
        this.renderStandaloneDock();
      },
      update: () => {
        this.renderStandaloneDock();
      },
    });

    if (registration) {
      this.standaloneDockRegistration = {
        type: STANDALONE_DOCK_TYPE,
        model: registration.model,
      };
    }

    this.syncStandaloneDockIcon();
  }

  private syncStandaloneDockIcon(): void {
    if (typeof document === "undefined") {
      return;
    }
    const dockItem = document.querySelector<HTMLElement>(`.dock__item[data-type="${STANDALONE_DOCK_TYPE}"]`);
    if (dockItem) {
      const use = dockItem.querySelector("svg use");
      if (use && use.getAttribute("xlink:href") !== `#${STANDALONE_DOCK_ICON_SYMBOL}`) {
        use.setAttribute("xlink:href", `#${STANDALONE_DOCK_ICON_SYMBOL}`);
      }
    }
  }

  private renderStandaloneDock(): void {
    this.syncStandaloneDockIcon();
    if (!this.standaloneDockHost || !this.currentConfig) {
      return;
    }

    const layout = this.currentConfig.surfaceLayouts?.["dock-panel"] || [];
    const buttonMap = new Map<string, PowerButtonItem>(
      this.currentConfig.items
        .filter(item => itemHasSurface(item, "dock-panel") && item.visible)
        .map(item => [item.id, item]),
    );

    const dockPanelEntries: DockPanelEntry[] = [];
    const usedButtonIds = new Set<string>();

    for (const entry of layout) {
      if (entry.type === "button") {
        const item = buttonMap.get(entry.id);
        if (item) {
          dockPanelEntries.push({ type: "button", item });
          usedButtonIds.add(entry.id);
        }
      } else if (entry.type === "divider") {
        dockPanelEntries.push({ type: "divider", id: entry.id, title: entry.title });
      }
    }

    for (const [id, item] of buttonMap) {
      if (!usedButtonIds.has(id)) {
        dockPanelEntries.push({ type: "button", item });
      }
    }

    renderStandaloneDockPanel(
      this.standaloneDockHost,
      dockPanelEntries,
      this.executor,
      () => {
        void this.executor.execute({
          actionType: "plugin-command",
          actionId: DEFAULT_PLUGIN_COMMAND,
        });
      },
      {
        title: this.t("dockPanelTitle", "随心按"),
        settings: this.t("dockPanelSettings", "设置"),
        empty: this.t("dockPanelEmpty", "暂未放置快捷按钮"),
        goToSettings: this.t("dockPanelGoToSettings", "前往设置添加"),
        addDivider: this.t("dockPanelAddDivider", "添加分割线"),
        editDivider: this.t("dockPanelEditDivider", "修改分区名称"),
        deleteDivider: this.t("dockPanelDeleteDivider", "删除分割线"),
      },
      {
        onAddDivider: () => this.handleAddDivider(),
        onEditDivider: (id, currentTitle) => this.handleEditDivider(id, currentTitle),
        onRemoveDivider: (id) => this.handleRemoveDivider(id),
        onMoveItem: (fromIndex, toIndex) => this.handleMoveDockItem(fromIndex, toIndex),
      },
    );
  }

  private async handleAddDivider(): Promise<void> {
    if (!this.currentConfig) return;
    const title = await promptDialog({
      title: this.t("dockPanelAddDivider", "添加分割线"),
      placeholder: this.t("dockPanelDividerTitlePrompt", "请输入分区名称（可选，留空为纯分割线）："),
      confirmText: this.t("confirm", "确定"),
      cancelText: this.t("cancel", "取消"),
    });
    if (title === null) return;
    if (!this.currentConfig.surfaceLayouts) {
      this.currentConfig.surfaceLayouts = {};
    }
    if (!this.currentConfig.surfaceLayouts["dock-panel"]) {
      this.currentConfig.surfaceLayouts["dock-panel"] = this.currentConfig.items
        .filter(item => itemHasSurface(item, "dock-panel"))
        .map(item => ({ type: "button", id: item.id }));
    }
    const newId = `divider-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const trimmed = title.trim();
    this.currentConfig.surfaceLayouts["dock-panel"]!.push({
      type: "divider",
      id: newId,
      ...(trimmed ? { title: trimmed } : {}),
    });
    this.renderStandaloneDock();
    await this.onSaveConfig?.(this.currentConfig);
  }

  private async handleEditDivider(id: string, currentTitle?: string): Promise<void> {
    if (!this.currentConfig?.surfaceLayouts?.["dock-panel"]) return;
    const list = this.currentConfig.surfaceLayouts["dock-panel"];
    const target = list.find(e => e.id === id && e.type === "divider");
    if (!target) return;
    const title = await promptDialog({
      title: this.t("dockPanelEditDivider", "修改分区名称"),
      placeholder: this.t("dockPanelDividerEditPrompt", "修改分区名称（留空为纯分割线）："),
      initialValue: currentTitle || "",
      confirmText: this.t("confirm", "确定"),
      cancelText: this.t("cancel", "取消"),
    });
    if (title === null) return;
    const trimmed = title.trim();
    if (trimmed) {
      target.title = trimmed;
    } else {
      delete target.title;
    }
    this.renderStandaloneDock();
    await this.onSaveConfig?.(this.currentConfig);
  }

  private async handleRemoveDivider(id: string): Promise<void> {
    if (!this.currentConfig?.surfaceLayouts?.["dock-panel"]) return;
    const shouldDelete = await confirmDialog({
      title: this.t("dockPanelDeleteDivider", "删除分割线"),
      message: this.t("dockPanelDividerDeleteConfirm", "确定删除此分割线吗？"),
      confirmText: this.t("confirm", "确定"),
      cancelText: this.t("cancel", "取消"),
    });
    if (!shouldDelete) return;
    this.currentConfig.surfaceLayouts["dock-panel"] = this.currentConfig.surfaceLayouts["dock-panel"]
      .filter(e => e.id !== id);
    this.renderStandaloneDock();
    await this.onSaveConfig?.(this.currentConfig);
  }

  private async handleMoveDockItem(fromIndex: number, toIndex: number): Promise<void> {
    if (!this.currentConfig) return;
    if (!this.currentConfig.surfaceLayouts?.["dock-panel"]) {
      this.currentConfig.surfaceLayouts = this.currentConfig.surfaceLayouts || {};
      this.currentConfig.surfaceLayouts["dock-panel"] = this.currentConfig.items
        .filter(item => itemHasSurface(item, "dock-panel"))
        .map(item => ({ type: "button", id: item.id }));
    }
    const list = this.currentConfig.surfaceLayouts["dock-panel"];
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    this.renderStandaloneDock();
    await this.onSaveConfig?.(this.currentConfig);
  }

  private t(key: string, defaultText: string): string {
    const pluginWithT = this.plugin as Plugin & { t?: (k: string) => string };
    if (typeof pluginWithT.t === "function") {
      return pluginWithT.t(key);
    }
    return defaultText;
  }

  private clearDynamicSurfaces(): void {
    this.nativeSuppressor.clear();
    this.toolbarPatchObserver?.disconnect();
    this.toolbarPatchObserver = null;
    this.restoreToolbarPatch();
    this.disabledToolbarNames.clear();
    this.customToolbarItems = [];
    this.selectionToolbarLayout = [];

    for (const element of this.topbarElements) {
      element.remove();
    }
    this.topbarElements = [];

    for (const element of this.statusElements) {
      element.remove();
    }
    this.statusElements = [];

    for (const element of this.canvasElements) {
      element.remove();
    }
    this.canvasElements = [];

    for (const registration of this.dockRegistrations) {
      if (hasDockRemove(registration.model)) {
        registration.model.remove(registration.type);
      }
    }
    this.dockRegistrations = [];
  }

  destroy(): void {
    this.clearDynamicSurfaces();

    if (this.standaloneDockRegistration && hasDockRemove(this.standaloneDockRegistration.model)) {
      this.standaloneDockRegistration.model.remove(this.standaloneDockRegistration.type);
    }
    this.standaloneDockRegistration = null;
    this.standaloneDockHost = null;
    this.currentConfig = null;
  }
}
