const BUILTIN_COMMAND_SELECTORS: Record<string, string[]> = {
  backlinks: [
    "#dockRight .dock__item[data-type='backlink']",
    "#dockRight .dock__item[data-type='backlinks']",
  ],
  bookmark: ["#dockLeft .dock__item[data-type='bookmark']"],
  fileTree: [
    "#dockLeft .dock__item[data-type='file']",
    "#dockLeft .dock__item[data-type='file-tree']",
  ],
  globalGraph: [
    "#dockBottom .dock__item[data-type='globalGraph']",
    "#dockBottom .dock__item[data-type='graph']",
  ],
  globalSearch: ["#barSearch"],
  inbox: ["#dockRight .dock__item[data-type='inbox']"],
  outline: ["#dockLeft .dock__item[data-type='outline']"],
  tag: ["#dockRight .dock__item[data-type='tag']"],
};

export function executeBuiltinCommandByDom(commandId: string, root: ParentNode = document): boolean {
  const selectors = BUILTIN_COMMAND_SELECTORS[commandId];
  if (!selectors?.length) {
    return false;
  }

  for (const selector of selectors) {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) {
      continue;
    }
    element.click();
    return true;
  }

  return false;
}
