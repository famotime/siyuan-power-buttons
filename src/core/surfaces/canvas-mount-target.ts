export type CanvasMountTarget = {
  container: HTMLElement;
  anchor: HTMLElement | null;
  kind: 'breadcrumb' | 'util';
};

function isHiddenElement(element: HTMLElement): boolean {
  return element.classList.contains('fn__hidden')
    || element.classList.contains('fn__none')
    || element.closest('.fn__hidden, .fn__none') !== null;
}

export function findCanvasMountTarget(root: ParentNode = document): CanvasMountTarget | null {
  const editors = Array.from(root.querySelectorAll<HTMLElement>('.layout__center .protyle'));
  const orderedEditors = [
    ...editors.filter(editor => !isHiddenElement(editor)),
    ...editors.filter(editor => isHiddenElement(editor)),
  ];

  for (const editor of orderedEditors) {
    const anchor = editor.querySelector<HTMLElement>(
      ".protyle-breadcrumb__bar [data-type='readonly'], .protyle-breadcrumb [data-type='readonly']",
    );
    if (anchor?.parentElement && !isHiddenElement(anchor)) {
      return {
        container: anchor.parentElement,
        anchor,
        kind: 'breadcrumb',
      };
    }

    const utilHost = editor.querySelector<HTMLElement>('.protyle-util .block__icons');
    if (utilHost && !isHiddenElement(utilHost)) {
      return {
        container: utilHost,
        anchor: null,
        kind: 'util',
      };
    }
  }

  const fallbackUtilHost = root.querySelector<HTMLElement>('.layout__center .protyle-util .block__icons');
  if (!fallbackUtilHost || isHiddenElement(fallbackUtilHost)) {
    return null;
  }

  return {
    container: fallbackUtilHost,
    anchor: null,
    kind: 'util',
  };
}
