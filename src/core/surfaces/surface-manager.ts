import type {
  Dock,
  Plugin,
} from "siyuan";
import { CommandExecutor } from "@/core/commands";
import {
  DEFAULT_ICONPARK_ICON,
  DEFAULT_PLUGIN_COMMAND,
} from "@/shared/constants";
import { renderIconMarkup } from "@/shared/icon-renderer";
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
import { NativeElementSuppressor } from "@/core/surfaces/native-element-suppressor";

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
  return renderIconMarkup({
    iconType: "iconpark",
    iconValue: icon,
  }, document);
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
    return item.iconValue.trim() ? createIconSvg(item.iconValue) : createIconSvg(DEFAULT_ICONPARK_ICON);
  }
  return createIconSvg(item.iconValue || DEFAULT_ICONPARK_ICON);
}

function createStatusElement(item: PowerButtonItem, executor: CommandExecutor): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "siyuan-power-buttons__button";
  button.title = item.tooltip || item.title;
  button.setAttribute("aria-label", item.tooltip || item.title);
  button.dataset.powerButtonsOwned = "true";
  button.dataset.powerButtonsItemId = item.id;
  button.innerHTML = getIconMarkup(item);
  button.addEventListener("click", () => {
    void executor.execute(item);
  });
  return button;
}

function isHiddenElement(element: HTMLElement): boolean {
  return element.classList.contains("fn__hidden")
    || element.classList.contains("fn__none")
    || element.closest(".fn__hidden, .fn__none") !== null;
}

type CanvasMountTarget = {
  container: HTMLElement;
  anchor: HTMLElement | null;
  kind: "breadcrumb" | "util";
};

function findCanvasMountTarget(root: ParentNode = document): CanvasMountTarget | null {
  const editors = Array.from(root.querySelectorAll<HTMLElement>(".layout__center .protyle"));
  const orderedEditors = [
    ...editors.filter(editor => !isHiddenElement(editor)),
    ...editors.filter(editor => isHiddenElement(editor)),
  ];

  for (const editor of orderedEditors) {
    const anchor = editor.querySelector<HTMLElement>(".protyle-breadcrumb__bar [data-type='readonly'], .protyle-breadcrumb [data-type='readonly']");
    if (anchor?.parentElement && !isHiddenElement(anchor)) {
      return {
        container: anchor.parentElement,
        anchor,
        kind: "breadcrumb",
      };
    }

    const utilHost = editor.querySelector<HTMLElement>(".protyle-util .block__icons");
    if (utilHost && !isHiddenElement(utilHost)) {
      return {
        container: utilHost,
        anchor: null,
        kind: "util",
      };
    }
  }

  const fallbackUtilHost = root.querySelector<HTMLElement>(".layout__center .protyle-util .block__icons");
  if (!fallbackUtilHost || isHiddenElement(fallbackUtilHost)) {
    return null;
  }

  return {
    container: fallbackUtilHost,
    anchor: null,
    kind: "util",
  };
}

function createCanvasElement(
  item: PowerButtonItem,
  executor: CommandExecutor,
  kind: CanvasMountTarget["kind"],
): HTMLElement {
  const element = createStatusElement(item, executor);
  if (kind === "breadcrumb") {
    element.classList.add("protyle-breadcrumb__icon");
  } else {
    element.classList.add("block__icon", "block__icon--show");
  }
  return element;
}

function createFixedSettingsTopbar(plugin: Plugin, executor: CommandExecutor): HTMLElement {
  const element = plugin.addTopBar({
    icon: "iconSettings",
    title: "打开快捷按钮设置",
    callback: () => {
      void executor.execute({
        actionType: "plugin-command",
        actionId: DEFAULT_PLUGIN_COMMAND,
      });
    },
  });
  element.dataset.powerButtonsOwned = "true";
  element.dataset.powerButtonsItemId = "fixed-open-settings";
  return element;
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
