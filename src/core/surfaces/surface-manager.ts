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
  }

  destroy(): void {
    this.nativeSuppressor.clear();

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
