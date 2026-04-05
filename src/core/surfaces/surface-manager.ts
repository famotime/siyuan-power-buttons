import type {
  Dock,
  Plugin,
  TPluginDockPosition,
} from "siyuan";
import { CommandExecutor } from "@/core/commands";
import { DEFAULT_BUILTIN_ICON } from "@/shared/constants";
import {
  isDockSurface,
  isStatusBarSurface,
  sortItems,
} from "@/shared/utils";
import type {
  PowerButtonItem,
  PowerButtonsConfig,
  SurfaceType,
} from "@/shared/types";

type DockRegistration = {
  type: string;
  model: unknown;
};

function hasDockRemove(model: unknown): model is Pick<Dock, "remove"> {
  return typeof (model as { remove?: unknown } | null | undefined)?.remove === "function";
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createIconSvg(icon: string): string {
  if (icon.trim().startsWith("<svg")) {
    return icon;
  }
  return `<svg class="siyuan-power-buttons__icon" aria-hidden="true"><use xlink:href="#${escapeAttribute(icon)}"></use></svg>`;
}

function createEmojiSvg(emoji: string): string {
  const safeEmoji = escapeAttribute(emoji || "⚙");
  return `<svg viewBox="0 0 24 24" class="siyuan-power-buttons__icon" aria-hidden="true"><text x="12" y="17" text-anchor="middle" font-size="15">${safeEmoji}</text></svg>`;
}

function getIconMarkup(item: PowerButtonItem): string {
  if (item.iconType === "emoji") {
    return createEmojiSvg(item.iconValue);
  }
  if (item.iconType === "svg") {
    return item.iconValue.trim() ? createIconSvg(item.iconValue) : createIconSvg(DEFAULT_BUILTIN_ICON);
  }
  return createIconSvg(item.iconValue || DEFAULT_BUILTIN_ICON);
}

function getDockPosition(surface: SurfaceType): TPluginDockPosition {
  switch (surface) {
    case "dock-left-top":
      return "LeftTop";
    case "dock-left-bottom":
      return "LeftBottom";
    case "dock-right-top":
      return "RightTop";
    case "dock-right-bottom":
      return "RightBottom";
    case "dock-bottom-left":
      return "BottomLeft";
    case "dock-bottom-right":
      return "BottomRight";
    default:
      return "LeftTop";
  }
}

function createStatusElement(item: PowerButtonItem, executor: CommandExecutor): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "siyuan-power-buttons__button";
  button.title = item.tooltip || item.title;
  button.dataset.powerButtonsOwned = "true";
  button.dataset.powerButtonsItemId = item.id;
  button.innerHTML = `${getIconMarkup(item)}<span class="siyuan-power-buttons__label">${item.title}</span>`;
  button.addEventListener("click", () => {
    void executor.execute(item);
  });
  return button;
}

function createDockPanel(item: PowerButtonItem, executor: CommandExecutor, host: HTMLElement): void {
  host.innerHTML = `
    <div class="siyuan-power-buttons__dock-panel">
      <div class="siyuan-power-buttons__dock-header">
        ${getIconMarkup(item)}
          <div>
          <div class="siyuan-power-buttons__dock-title">${item.title}</div>
          <div class="siyuan-power-buttons__dock-description">${item.tooltip || "执行当前按钮绑定的动作"}</div>
        </div>
      </div>
      <button type="button" class="b3-button b3-button--outline siyuan-power-buttons__dock-action">执行动作</button>
    </div>
  `;
  host.querySelector<HTMLButtonElement>(".siyuan-power-buttons__dock-action")?.addEventListener("click", () => {
    void executor.execute(item);
  });
}

export class SurfaceManager {
  private topbarElements: HTMLElement[] = [];
  private statusElements: HTMLElement[] = [];
  private dockRegistrations: DockRegistration[] = [];

  constructor(
    private readonly plugin: Plugin,
    private readonly executor: CommandExecutor,
  ) {}

  render(config: PowerButtonsConfig): void {
    this.destroy();

    const visibleItems = sortItems(config.items).filter(item => item.visible);

    for (const item of visibleItems) {
      if (item.surface === "topbar") {
        const element = this.plugin.addTopBar({
          icon: item.iconType === "builtin" ? item.iconValue || DEFAULT_BUILTIN_ICON : getIconMarkup(item),
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
            icon: item.iconType === "builtin" ? item.iconValue || DEFAULT_BUILTIN_ICON : getIconMarkup(item),
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
  }

  destroy(): void {
    for (const element of this.topbarElements) {
      element.remove();
    }
    this.topbarElements = [];

    for (const element of this.statusElements) {
      element.remove();
    }
    this.statusElements = [];

    for (const registration of this.dockRegistrations) {
      if (hasDockRemove(registration.model)) {
        registration.model.remove(registration.type);
      }
    }
    this.dockRegistrations = [];
  }
}
