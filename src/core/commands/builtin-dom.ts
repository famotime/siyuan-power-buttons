import { BUILTIN_COMMANDS } from "@/core/commands/catalog";
import { triggerElementBySmartSelectors } from "@/core/commands/dom-query";

const BUILTIN_COMMAND_QUERIES: Record<string, string[]> = {
  backlinks: [
    "#dockRight .dock__item[data-type='backlink']",
    "#dockRight .dock__item[data-type='backlinks']",
    "backlink",
    "backlinks",
    "barBacklink",
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
  syncNow: [
    "#barSync",
    "barSync",
    "menuSyncNow",
    "syncNow",
    "sync",
  ],
};

function getBuiltinCommandQueries(commandId: string): string[] {
  const queries = BUILTIN_COMMAND_QUERIES[commandId];
  if (!queries?.length) {
    return [];
  }

  const title = BUILTIN_COMMANDS.find(command => command.id === commandId)?.title.trim();
  if (!title) {
    return queries;
  }

  return [
    ...queries,
    title,
    `text:${title}`,
  ];
}

export function executeBuiltinCommandByDom(commandId: string, root: ParentNode = document): boolean {
  const queries = getBuiltinCommandQueries(commandId);
  if (!queries?.length) {
    return false;
  }
  return triggerElementBySmartSelectors(queries, root);
}
