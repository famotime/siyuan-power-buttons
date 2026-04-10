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

function queryByText(text: string, root: ParentNode): HTMLElement | null {
  for (const element of root.querySelectorAll("*")) {
    if (normalizeText(element.textContent) === text) {
      return toClickableElement(element);
    }
  }
  return null;
}

function queryByIdentifier(identifier: string, root: ParentNode): HTMLElement | null {
  const escaped = escapeAttributeValue(identifier);
  const queryRoot = root as ParentNode & {
    getElementById?: (id: string) => HTMLElement | null;
    querySelector: (selector: string) => Element | null;
  };

  return queryRoot.getElementById?.(identifier)
    || toClickableElement(queryRoot.querySelector(`[data-id="${escaped}"]`))
    || toClickableElement(queryRoot.querySelector(`[data-menu-id="${escaped}"]`))
    || toClickableElement(queryRoot.querySelector(`[data-type="${escaped}"]`))
    || toClickableElement(queryRoot.querySelector(`[data-action="${escaped}"]`))
    || toClickableElement(queryRoot.querySelector(`.${escapeClassName(identifier)}`))
    || toClickableElement(queryRoot.querySelector(`use[href="#${escaped}"], use[xlink\\:href="#${escaped}"]`))
    || null;
}

function looksLikeCssSelector(selector: string): boolean {
  return /^[.#\[]/.test(selector)
    || selector.includes(" ")
    || selector.includes(">")
    || selector.includes(":")
    || selector.includes("~");
}

export function findElementBySmartSelector(selector: string, root: ParentNode = document): HTMLElement | null {
  const trimmed = selector.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("text:")) {
    return queryByText(normalizeText(trimmed.slice(5)), root);
  }

  if (looksLikeCssSelector(trimmed)) {
    return toClickableElement(root.querySelector(trimmed));
  }

  return queryByIdentifier(trimmed, root);
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
