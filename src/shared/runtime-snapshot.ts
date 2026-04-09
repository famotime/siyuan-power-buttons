import type {
  PreviewButtonItem,
  PreviewSurfaceType,
  SurfaceType,
} from "@/shared/types";

const TOPBAR_SELECTORS = ["#toolbar > .toolbar__item"];
const STATUS_SELECTORS = ["#status button", "#status .status__item", "#status .toolbar__item", "#status [id^='status']", "#status [id^='bar']"];
const LEFT_DOCK_SELECTORS = ["#dockLeft .dock__item", ".dock#dockLeft .dock__item"];
const RIGHT_DOCK_SELECTORS = ["#dockRight .dock__item", ".dock#dockRight .dock__item"];
const BOTTOM_DOCK_SELECTORS = ["#dockBottom .dock__item", ".dock#dockBottom .dock__item"];
const CANVAS_SELECTORS = [
  ".layout__center .protyle-util .block__icons > button",
  ".layout__center .protyle-util .block__icons [data-type]",
];
const WINDOW_CONTROL_IDS = new Set(["minWindow", "maxWindow", "restoreWindow", "closeWindow", "pinWindow"]);

function queryUniqueElements(
  root: ParentNode,
  selectors: string[],
  shouldInclude: (element: HTMLElement) => boolean = () => true,
): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const elements: HTMLElement[] = [];

  for (const selector of selectors) {
    for (const node of root.querySelectorAll<HTMLElement>(selector)) {
      if (seen.has(node) || isPluginOwned(node) || !shouldInclude(node)) {
        continue;
      }
      seen.add(node);
      elements.push(node);
    }
  }

  return elements;
}

function isPluginOwned(element: HTMLElement): boolean {
  if (element.dataset.powerButtonsOwned === "true") {
    return true;
  }
  const type = element.getAttribute("data-type") || element.dataset.type || "";
  return type.startsWith("siyuan-power-buttons-") || element.id.startsWith("siyuan-power-buttons-");
}

function isPreviewHidden(element: HTMLElement): boolean {
  if (element.matches(".fn__none, [hidden], [data-hide='true']")) {
    return true;
  }
  return Boolean(element.closest(".fn__none, [hidden], [data-hide='true']"));
}

function isIgnoredTopbarElement(element: HTMLElement): boolean {
  if (isPreviewHidden(element)) {
    return true;
  }
  if (WINDOW_CONTROL_IDS.has(element.id)) {
    return true;
  }
  if (element.matches(".toolbar__item--win, .toolbar__item--close")) {
    return true;
  }
  return Boolean(element.closest("#windowControls, .toolbar__window"));
}

function isIgnoredDockElement(element: HTMLElement): boolean {
  if (isPreviewHidden(element)) {
    return true;
  }
  return element.matches(".dock__item--pin");
}

function getElementLabel(element: HTMLElement, index: number): string {
  return element.getAttribute("aria-label")
    || element.getAttribute("title")
    || element.textContent?.trim()
    || element.id
    || `原生按钮 ${index + 1}`;
}

function getElementIconMarkup(element: HTMLElement): string | undefined {
  const svg = element.querySelector("svg");
  if (svg) {
    return svg.outerHTML;
  }

  const iconText = getElementLabel(element, 0).trim().slice(0, 1);
  if (!iconText) {
    return undefined;
  }
  return `<span class="siyuan-power-buttons__native-fallback-icon">${iconText}</span>`;
}

function getMidpoint(element: HTMLElement, axis: "x" | "y"): number {
  const rect = element.getBoundingClientRect();
  if (axis === "x") {
    return rect.left + rect.width / 2;
  }
  return rect.top + rect.height / 2;
}

type SortMode = "x" | "y" | "flow-horizontal";

function sortElements(elements: HTMLElement[], mode: SortMode): HTMLElement[] {
  return [...elements].sort((left, right) => {
    if (mode === "flow-horizontal") {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      const rowTolerance = Math.max(6, Math.min(leftRect.height || 0, rightRect.height || 0) / 2);
      const topDiff = leftRect.top - rightRect.top;
      if (Math.abs(topDiff) > rowTolerance) {
        return topDiff;
      }
      return leftRect.left - rightRect.left;
    }

    return getMidpoint(left, mode) - getMidpoint(right, mode);
  });
}

function mapElementsToPreview(
  elements: HTMLElement[],
  surfaceFactory: (element: HTMLElement) => PreviewSurfaceType,
  sortMode: SortMode,
): PreviewButtonItem[] {
  return sortElements(elements, sortMode).map((element, index) => ({
    id: `native:${surfaceFactory(element)}:${element.id || element.getAttribute("data-type") || index}`,
    itemId: undefined,
    title: getElementLabel(element, index),
    visible: true,
    surface: surfaceFactory(element),
    order: index,
    editable: false,
    source: "native",
    iconMarkup: getElementIconMarkup(element),
  }));
}

function splitSurfaceByContainer(
  elements: HTMLElement[],
  container: HTMLElement | null,
  startSurface: SurfaceType,
  endSurface: SurfaceType,
  axis: "x" | "y",
  sortMode: SortMode = axis,
): PreviewButtonItem[] {
  if (!container || elements.length === 0) {
    return mapElementsToPreview(elements, () => startSurface, sortMode);
  }

  const threshold = getMidpoint(container, axis);
  return mapElementsToPreview(elements, element => {
    return getMidpoint(element, axis) < threshold ? startSurface : endSurface;
  }, sortMode);
}

export function readNativeSurfaceSnapshot(root: ParentNode = document): PreviewButtonItem[] {
  const topbar = mapElementsToPreview(
    queryUniqueElements(root, TOPBAR_SELECTORS, element => !isIgnoredTopbarElement(element)),
    () => "topbar",
    "flow-horizontal",
  );
  const statusContainer = root.querySelector<HTMLElement>("#status");
  const statusbar = splitSurfaceByContainer(
    queryUniqueElements(root, STATUS_SELECTORS),
    statusContainer,
    "statusbar-left",
    "statusbar-right",
    "x",
  );
  const leftDock = splitSurfaceByContainer(
    queryUniqueElements(root, LEFT_DOCK_SELECTORS, element => !isIgnoredDockElement(element)),
    root.querySelector<HTMLElement>("#dockLeft"),
    "dock-left-top",
    "dock-left-bottom",
    "y",
  );
  const rightDock = splitSurfaceByContainer(
    queryUniqueElements(root, RIGHT_DOCK_SELECTORS, element => !isIgnoredDockElement(element)),
    root.querySelector<HTMLElement>("#dockRight"),
    "dock-right-top",
    "dock-right-bottom",
    "y",
  );
  const bottomDock = splitSurfaceByContainer(
    queryUniqueElements(root, BOTTOM_DOCK_SELECTORS, element => !isIgnoredDockElement(element)),
    root.querySelector<HTMLElement>("#dockBottom"),
    "dock-bottom-left",
    "dock-bottom-right",
    "x",
  );
  const canvas = mapElementsToPreview(
    queryUniqueElements(root, CANVAS_SELECTORS, element => !isPreviewHidden(element)),
    () => "canvas",
    "flow-horizontal",
  );

  return [
    ...topbar,
    ...statusbar,
    ...leftDock,
    ...rightDock,
    ...bottomDock,
    ...canvas,
  ];
}
