function escapeAttributeValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function escapeClassName(value: string): string {
  return value.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

function normalizeText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function toClickableElement(element: Element | null): HTMLElement | null {
  if (!element) {
    return null;
  }
  const HTMLElementCtor = element.ownerDocument?.defaultView?.HTMLElement;
  if (HTMLElementCtor && element instanceof HTMLElementCtor) {
    return element;
  }
  const candidate = element.closest?.("button,[role='button'],.toolbar__item,.b3-menu__item");
  if (HTMLElementCtor && candidate instanceof HTMLElementCtor) {
    return candidate;
  }
  return HTMLElementCtor && element.parentElement instanceof HTMLElementCtor ? element.parentElement : null;
}

function queryAllByText(text: string, root: ParentNode): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  for (const element of root.querySelectorAll("*")) {
    if (normalizeText(element.textContent) === text) {
      const clickable = toClickableElement(element);
      if (clickable && !seen.has(clickable)) {
        seen.add(clickable);
        elements.push(clickable);
      }
    }
  }

  return elements;
}

function queryAllByIdentifier(identifier: string, root: ParentNode): HTMLElement[] {
  const escaped = escapeAttributeValue(identifier);
  const queryRoot = root as ParentNode & {
    getElementById?: (id: string) => HTMLElement | null;
    querySelector: (selector: string) => Element | null;
    querySelectorAll: (selector: string) => NodeListOf<Element>;
  };
  const matches: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const addMatch = (element: Element | null): void => {
    const clickable = toClickableElement(element);
    if (clickable && !seen.has(clickable)) {
      seen.add(clickable);
      matches.push(clickable);
    }
  };

  const addMatches = (selector: string): void => {
    for (const element of queryRoot.querySelectorAll(selector)) {
      addMatch(element);
    }
  };

  addMatch(queryRoot.getElementById?.(identifier) || null);
  addMatches(`[data-id="${escaped}"]`);
  addMatches(`[data-name="${escaped}"]`);
  addMatches(`[data-menu-id="${escaped}"]`);
  addMatches(`[data-type="${escaped}"]`);
  addMatches(`[data-action="${escaped}"]`);
  addMatches(`.${escapeClassName(identifier)}`);
  addMatches(`use[href="#${escaped}"], use[xlink\\:href="#${escaped}"]`);

  return matches;
}

function looksLikeCssSelector(selector: string): boolean {
  return /^[.#\[]/.test(selector)
    || selector.includes(" ")
    || selector.includes(">")
    || selector.includes(":")
    || selector.includes("~");
}

export function findElementBySmartSelector(selector: string, root: ParentNode = document): HTMLElement | null {
  return findElementsBySmartSelector(selector, root)[0] || null;
}

export function findElementsBySmartSelector(selector: string, root: ParentNode = document): HTMLElement[] {
  const trimmed = selector.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("text:")) {
    return queryAllByText(normalizeText(trimmed.slice(5)), root);
  }

  if (looksLikeCssSelector(trimmed)) {
    const matches: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();
    for (const element of root.querySelectorAll(trimmed)) {
      const clickable = toClickableElement(element);
      if (clickable && !seen.has(clickable)) {
        seen.add(clickable);
        matches.push(clickable);
      }
    }
    return matches;
  }

  return queryAllByIdentifier(trimmed, root);
}

function clickElement(element: HTMLElement): boolean {
  try {
    element.click();
    return true;
  } catch {
    const view = element.ownerDocument?.defaultView;
    if (!view) {
      return false;
    }
    return element.dispatchEvent(new view.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    }));
  }
}

export function triggerElementBySmartSelectors(selectors: string[], root: ParentNode = document): boolean {
  for (const selector of selectors) {
    const element = findElementBySmartSelector(selector, root);
    if (!element) {
      continue;
    }
    if (clickElement(element)) {
      return true;
    }
  }

  return false;
}
