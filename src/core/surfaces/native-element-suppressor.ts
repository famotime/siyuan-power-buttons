import { findElementsBySmartSelector } from "@/core/commands";
import type { DisabledNativeButton } from "@/shared/types";

type ObserveTarget = {
  observerRoot: ParentNode;
  scanRoot: ParentNode;
};

type SuppressedElementState = {
  hidden: boolean;
  display: string;
  pointerEvents: string;
  ariaHidden: string | null;
  tabIndex: number;
  disabled?: boolean;
  restore: (event: Event) => void;
};

function normalizeSelectors(selectors: string[]): string[] {
  return Array.from(new Set(selectors.map(selector => selector.trim()).filter(Boolean)));
}

function prioritizeSelectors(selectors: string[]): string[] {
  return [...selectors].sort((left, right) => selectorPriority(left) - selectorPriority(right));
}

function selectorPriority(selector: string): number {
  const trimmed = selector.trim();
  if (trimmed.startsWith("text:")) {
    return 20;
  }
  if (trimmed.startsWith("#")) {
    return 0;
  }
  if (trimmed.startsWith("[data-")) {
    return 1;
  }
  if (trimmed.startsWith(".")) {
    return 2;
  }
  if (trimmed.startsWith("[")) {
    return 3;
  }
  return 10;
}

function createBlockHandler(): (event: Event) => void {
  return (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
}

function isSuppressionCandidate(element: HTMLElement): boolean {
  if (element.dataset.powerButtonsOwned === "true") {
    return false;
  }

  return element.closest(".power-buttons-settings, .siyuan-power-buttons-settings-host") === null;
}

export class NativeElementSuppressor {
  private observers: MutationObserver[] = [];
  private scheduledRoots = new Set<ParentNode>();
  private readonly suppressedElements = new Map<HTMLElement, SuppressedElementState>();
  private rules: DisabledNativeButton[] = [];

  apply(rules: DisabledNativeButton[], root: ParentNode = document): void {
    this.clear();
    this.rules = rules.map(rule => ({
      ...rule,
      selectors: prioritizeSelectors(normalizeSelectors(rule.selectors)),
    })).filter(rule => rule.selectors.length > 0);

    if (!this.rules.length) {
      return;
    }

    this.applyNow(root);

    for (const target of this.resolveObserveTargets(root)) {
      const observer = new MutationObserver(() => {
        if (this.scheduledRoots.has(target.scanRoot)) {
          return;
        }
        this.scheduledRoots.add(target.scanRoot);
        queueMicrotask(() => {
          this.scheduledRoots.delete(target.scanRoot);
          this.applyNow(target.scanRoot);
        });
      });
      observer.observe(target.observerRoot, {
        childList: true,
        subtree: true,
      });
      this.observers.push(observer);
    }
  }

  clear(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
    this.scheduledRoots.clear();

    for (const [element, state] of this.suppressedElements) {
      element.hidden = state.hidden;
      element.style.display = state.display;
      element.style.pointerEvents = state.pointerEvents;
      if (state.ariaHidden === null) {
        element.removeAttribute("aria-hidden");
      } else {
        element.setAttribute("aria-hidden", state.ariaHidden);
      }
      element.tabIndex = state.tabIndex;
      if (typeof state.disabled === "boolean" && "disabled" in element) {
        (element as HTMLButtonElement).disabled = state.disabled;
      }
      element.removeEventListener("click", state.restore, true);
      element.removeEventListener("mousedown", state.restore, true);
      element.removeEventListener("pointerdown", state.restore, true);
    }

    this.suppressedElements.clear();
    this.rules = [];
  }

  private resolveObserveTargets(root: ParentNode): ObserveTarget[] {
    const targets = new Map<ParentNode, ObserveTarget>();
    const addTarget = (observerRoot: ParentNode | null | undefined, scanRoot: ParentNode | null | undefined): void => {
      if (!observerRoot || !scanRoot) {
        return;
      }
      if (!targets.has(observerRoot)) {
        targets.set(observerRoot, { observerRoot, scanRoot });
      }
    };

    if (!(root instanceof Document)) {
      addTarget(root, root);
      return [...targets.values()];
    }

    for (const rule of this.rules) {
      switch (rule.surface) {
        case "topbar":
          addTarget(root.querySelector("#toolbar"), root.querySelector("#toolbar") || root);
          break;
        case "statusbar-left":
        case "statusbar-right":
          addTarget(root.querySelector("#status"), root.querySelector("#status") || root);
          break;
        case "canvas": {
          const canvasRoots = Array.from(root.querySelectorAll(".layout__center .protyle, .layout__center .protyle-util"));
          if (canvasRoots.length === 0) {
            addTarget(root.querySelector(".layout__center"), root.querySelector(".layout__center") || root);
          } else {
            for (const canvasRoot of canvasRoots) {
              addTarget(canvasRoot, canvasRoot);
            }
          }
          break;
        }
        case "dock-left-top":
        case "dock-left-bottom":
          addTarget(root.querySelector("#dockLeft"), root.querySelector("#dockLeft") || root);
          break;
        case "dock-right-top":
        case "dock-right-bottom":
          addTarget(root.querySelector("#dockRight"), root.querySelector("#dockRight") || root);
          break;
        case "dock-bottom-left":
        case "dock-bottom-right":
          addTarget(root.querySelector("#dockBottom"), root.querySelector("#dockBottom") || root);
          break;
        default:
          addTarget(root.body, root);
      }
    }

    return [...targets.values()];
  }

  private applyNow(root: ParentNode): void {
    for (const rule of this.rules) {
      for (const selector of rule.selectors) {
        let matched = false;
        for (const element of findElementsBySmartSelector(selector, root)) {
          if (!isSuppressionCandidate(element)) {
            continue;
          }
          this.suppressElement(element);
          matched = true;
        }
        if (matched) {
          break;
        }
      }
    }
  }

  private suppressElement(element: HTMLElement): void {
    if (this.suppressedElements.has(element)) {
      return;
    }

    const restore = createBlockHandler();
    this.suppressedElements.set(element, {
      hidden: element.hidden,
      display: element.style.display,
      pointerEvents: element.style.pointerEvents,
      ariaHidden: element.getAttribute("aria-hidden"),
      tabIndex: element.tabIndex,
      disabled: "disabled" in element ? (element as HTMLButtonElement).disabled : undefined,
      restore,
    });

    element.hidden = true;
    element.style.display = "none";
    element.style.pointerEvents = "none";
    element.setAttribute("aria-hidden", "true");
    element.tabIndex = -1;
    if ("disabled" in element) {
      (element as HTMLButtonElement).disabled = true;
    }
    element.addEventListener("click", restore, true);
    element.addEventListener("mousedown", restore, true);
    element.addEventListener("pointerdown", restore, true);
  }
}
