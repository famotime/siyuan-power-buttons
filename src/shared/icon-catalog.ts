export interface BuiltinIconOption {
  value: string;
  label: string;
  keywords: string[];
}

export const BUILTIN_ICON_OPTIONS: BuiltinIconOption[] = [
  { value: "iconSearch", label: "搜索", keywords: ["search", "find", "搜索"] },
  { value: "iconSettings", label: "设置", keywords: ["settings", "config", "设置"] },
  { value: "iconList", label: "列表", keywords: ["list", "outline", "列表", "大纲"] },
  { value: "iconMenu", label: "菜单", keywords: ["menu", "主菜单", "菜单"] },
  { value: "iconHome", label: "主页", keywords: ["home", "主页", "首页"] },
  { value: "iconRefresh", label: "刷新", keywords: ["refresh", "sync", "刷新", "同步"] },
  { value: "iconPlus", label: "新建", keywords: ["plus", "new", "add", "新建", "添加"] },
  { value: "iconRight", label: "前进", keywords: ["forward", "next", "前进"] },
  { value: "iconLeft", label: "返回", keywords: ["back", "left", "返回"] },
  { value: "iconLayout", label: "布局", keywords: ["layout", "dock", "布局"] },
  { value: "iconDock", label: "停靠", keywords: ["dock", "停靠"] },
  { value: "iconBookmark", label: "书签", keywords: ["bookmark", "书签"] },
  { value: "iconTag", label: "标签", keywords: ["tag", "标签"] },
  { value: "iconGraph", label: "关系图", keywords: ["graph", "关系图"] },
  { value: "iconFile", label: "文件", keywords: ["file", "文档", "文件"] },
  { value: "iconInbox", label: "收集箱", keywords: ["inbox", "收集箱"] },
  { value: "iconHelp", label: "帮助", keywords: ["help", "帮助"] },
  { value: "iconInfo", label: "信息", keywords: ["info", "信息"] },
];

export function filterBuiltinIcons(keyword: string): BuiltinIconOption[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return BUILTIN_ICON_OPTIONS;
  }

  return BUILTIN_ICON_OPTIONS.filter(icon => {
    return icon.value.toLowerCase().includes(normalized)
      || icon.label.toLowerCase().includes(normalized)
      || icon.keywords.some(item => item.toLowerCase().includes(normalized));
  });
}
