import { findElementsBySmartSelector } from "@/core/commands";
import type { DisabledNativeButton } from "@/shared/types";

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

function createBlockHandler(): (event: Event) => void {
  return (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
}

export class NativeElementSuppressor {
  private observer: MutationObserver | null = null;
  private scheduled = false;
  private readonly suppressedElements = new Map<HTMLElement, SuppressedElementState>();
  private rules: DisabledNativeButton[] = [];

  apply(rules: DisabledNativeButton[], root: ParentNode = document): void {
    this.clear();
    this.rules = rules.map(rule => ({
      ...rule,
      selectors: normalizeSelectors(rule.selectors),
    })).filter(rule => rule.selectors.length > 0);

    if (!this.rules.length) {
      return;
    }

    this.applyNow(root);
    const observerRoot = root instanceof Document ? root.body : root;
    if (!observerRoot) {
      return;
    }

    this.observer = new MutationObserver(() => {
      if (this.scheduled) {
        return;
      }
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;
        this.applyNow(root);
      });
    });
    this.observer.observe(observerRoot, {
      childList: true,
      subtree: true,
    });
  }

  clear(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.scheduled = false;

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

  private applyNow(root: ParentNode): void {
    for (const rule of this.rules) {
      for (const selector of rule.selectors) {
        for (const element of findElementsBySmartSelector(selector, root)) {
          this.suppressElement(element);
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
