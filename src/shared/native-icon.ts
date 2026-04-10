const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function getUseHref(element: Element): string {
  return (element.getAttribute("href") || element.getAttribute("xlink:href") || "").replace(/^#/, "").trim();
}

export function createNativeFallbackIconMarkup(title: string): string {
  const iconText = title.trim().slice(0, 1) || "?";
  return `<span class="siyuan-power-buttons__native-fallback-icon">${iconText}</span>`;
}

function inlineSymbolUses(svg: SVGElement, ownerDocument: Document): string | undefined {
  const clone = svg.cloneNode(true) as SVGElement;
  const uses = Array.from(clone.querySelectorAll("use"));

  if (!uses.length) {
    return clone.outerHTML;
  }

  for (const use of uses) {
    const symbolId = getUseHref(use);
    if (!symbolId) {
      return undefined;
    }

    const symbol = ownerDocument.getElementById(symbolId);
    if (!symbol || symbol.tagName.toLowerCase() !== "symbol") {
      return undefined;
    }

    const group = ownerDocument.createElementNS(SVG_NAMESPACE, "g");
    for (const attribute of Array.from(use.attributes)) {
      if (attribute.name === "href" || attribute.name === "xlink:href") {
        continue;
      }
      group.setAttribute(attribute.name, attribute.value);
    }

    for (const child of Array.from(symbol.childNodes)) {
      group.appendChild(child.cloneNode(true));
    }

    if (!clone.getAttribute("viewBox")) {
      const viewBox = symbol.getAttribute("viewBox");
      if (viewBox) {
        clone.setAttribute("viewBox", viewBox);
      }
    }

    use.replaceWith(group);
  }

  return clone.outerHTML;
}

export function resolveNativeIconMarkup(markup: string | undefined, ownerDocument: Document = document): string | undefined {
  const trimmed = markup?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!trimmed.startsWith("<svg")) {
    return trimmed;
  }

  const template = ownerDocument.createElement("template");
  template.innerHTML = trimmed;
  const svg = template.content.querySelector("svg");
  if (!(svg instanceof SVGElement)) {
    return undefined;
  }

  return inlineSymbolUses(svg, ownerDocument);
}
