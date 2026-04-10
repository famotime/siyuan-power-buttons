import { triggerElementBySmartSelectors } from "@/core/commands/dom-query";

const BUILTIN_COMMAND_QUERIES: Record<string, string[]> = {
  backlinks: [
    "#dockRight .dock__item[data-type='backlink']",
    "#dockRight .dock__item[data-type='backlinks']",
    "backlink",
    "backlinks",
    "barBacklink",
  ],
  bookmark: [
    "#dockLeft .dock__item[data-type='bookmark']",
    "bookmark",
    "barBookmark",
  ],
  config: [
    "#barSettings",
    "barSettings",
    "menuSetting",
    "setting",
    "config",
  ],
  dailyNote: [
    "#barDaily",
    "barDaily",
    "menuNewDaily",
    "dailyNote",
    "daily",
  ],
  fileTree: [
    "#dockLeft .dock__item[data-type='file']",
    "#dockLeft .dock__item[data-type='file-tree']",
    "barFile",
    "toolbarFile",
    "file",
    "fileTree",
  ],
  globalGraph: [
    "#dockBottom .dock__item[data-type='globalGraph']",
    "#dockBottom .dock__item[data-type='graph']",
    "barGraphGlobal",
    "globalGraph",
  ],
  globalSearch: [
    "#barSearch",
    "barSearch",
    "menuSearch",
    "globalSearch",
    "search",
  ],
  goBack: [
    "barBack",
    "goBack",
    "back",
  ],
  goForward: [
    "barForward",
    "goForward",
    "forward",
  ],
  graphView: [
    "#dockBottom .dock__item[data-type='graph']",
    "barGraph",
    "graph",
    "graphView",
  ],
  inbox: [
    "#dockRight .dock__item[data-type='inbox']",
    "barInbox",
    "menuInbox",
    "inbox",
  ],
  mainMenu: [
    "toolbarMore",
    "barMore",
    "more",
    "iconMore",
  ],
  newFile: [
    "#barNewDoc",
    "barNewDoc",
    "menuNewDoc",
    "newFile",
    "new",
  ],
  outline: [
    "#dockLeft .dock__item[data-type='outline']",
    "barOutline",
    "outline",
  ],
  recentDocs: [
    "menuRecent",
    "recentDocs",
    "recent",
  ],
  riffCard: [
    "menuCard",
    "riffCard",
    "barRiffCard",
  ],
  stickSearch: [
    "pin",
    "stickySearch",
    "stickSearch",
  ],
  syncNow: [
    "#barSync",
    "barSync",
    "menuSyncNow",
    "syncNow",
    "sync",
  ],
  tag: [
    "#dockRight .dock__item[data-type='tag']",
    "barTag",
    "tag",
  ],
};

export function executeBuiltinCommandByDom(commandId: string, root: ParentNode = document): boolean {
  const queries = BUILTIN_COMMAND_QUERIES[commandId];
  if (!queries?.length) {
    return false;
  }
  return triggerElementBySmartSelectors(queries, root);
}
