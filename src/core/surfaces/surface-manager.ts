import type {
  Plugin,
} from "siyuan";
import { CommandExecutor } from "@/core/commands";
import {
  getDockPosition,
  isDockSurface,
  isStatusBarSurface,
} from "@/shared/surface-metadata";
import {
  sortItems,
} from "@/shared/utils";
import type {
  PowerButtonItem,
  PowerButtonsConfig,
} from "@/shared/types";
import { findCanvasMountTarget } from "@/core/surfaces/canvas-mount-target";
import { NativeElementSuppressor } from "@/core/surfaces/native-element-suppressor";
import {
  createCanvasElement,
  createDockPanel,
  createFixedSettingsTopbar,
  createStatusElement,
  type DockRegistration,
  getIconMarkup,
  hasDockRemove,
} from "@/core/surfaces/surface-elements";

export class SurfaceManager {
  private topbarElements: HTMLElement[] = [];
  private statusElements: HTMLElement[] = [];
  private canvasElements: HTMLElement[] = [];
  private dockRegistrations: DockRegistration[] = [];
  private nativeSuppressor = new NativeElementSuppressor();
  private toolbarPatchObserver: MutationObserver | null = null;
  private disabledToolbarNames = new Set<string>();
  private patchedToolbarItems = new Set<HTMLElement>();
  private customToolbarItems: PowerButtonItem[] = [];
  private injectedToolbarItems = new Set<HTMLElement>();

  constructor(
    private readonly plugin: Plugin,
    private readonly executor: CommandExecutor,
  ) {}

  render(config: PowerButtonsConfig): void {
    this.destroy();

    this.topbarElements.push(createFixedSettingsTopbar(this.plugin, this.executor));

    const visibleItems = sortItems(config.items).filter(item => item.visible);

    for (const item of visibleItems) {
      if (item.surface === "topbar") {
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
        continue;
      }

      if (isStatusBarSurface(item.surface)) {
        const element = this.plugin.addStatusBar({
          element: createStatusElement(item, this.executor),
          position: item.surface === "statusbar-left" ? "left" : "right",
        });
        this.statusElements.push(element);
        continue;
      }

      if (item.surface === "canvas") {
        const target = findCanvasMountTarget(document);
        if (!target) {
          continue;
        }
        const element = createCanvasElement(item, this.executor, target.kind);
        if (target.anchor) {
          target.container.insertBefore(element, target.anchor);
        } else {
          target.container.appendChild(element);
        }
        this.canvasElements.push(element);
        continue;
      }

      if (item.surface === "selection-toolbar") {
        // 浮动工具栏按钮由 updateProtyleToolbar + patchSelectionToolbar 管理
        continue;
      }

      if (isDockSurface(item.surface)) {
        const type = `siyuan-power-buttons-${item.id}`;
        const registration = this.plugin.addDock({
          type,
          data: {
            itemId: item.id,
          },
          config: {
            position: getDockPosition(item.surface),
            size: item.surface.startsWith("dock-bottom")
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
        this.dockRegistrations.push({
          type,
          model: registration.model,
        });
      }
    }

    this.nativeSuppressor.apply(config.disabledNativeButtons, document);

    // 禁用浮动工具栏原生按钮
    this.disabledToolbarNames = new Set(
      config.disabledSelectionToolbarItems.map(item => item.name),
    );
    // 缓存浮动工具栏自定义按钮，供 DOM 注入使用
    this.customToolbarItems = config.items
      .filter(item => item.surface === "selection-toolbar" && item.visible)
      .sort((a, b) => a.order - b.order);
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

    const needsPatch = this.disabledToolbarNames.size > 0 || this.customToolbarItems.length > 0;
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
    }
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

  destroy(): void {
    this.nativeSuppressor.clear();
    this.toolbarPatchObserver?.disconnect();
    this.toolbarPatchObserver = null;
    this.restoreToolbarPatch();
    this.disabledToolbarNames.clear();
    this.customToolbarItems = [];

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
}
