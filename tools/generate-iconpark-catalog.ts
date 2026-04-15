import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as IconPark from "@icon-park/svg";

type IconParkExport = (props?: Record<string, unknown>) => string;

type IconParkEntry = {
  value: string;
  name: string;
  label: string;
  category: string;
  keywords: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.resolve(ROOT, "src/generated/iconpark-catalog.ts");

const LABEL_OVERRIDES: Record<string, string> = {
  Search: "搜索",
  Setting: "设置",
  ListView: "列表",
  MenuFold: "菜单",
  Home: "主页",
  Refresh: "刷新",
  Plus: "新建",
  Right: "前进",
  Left: "返回",
  Bookmark: "书签",
  Tag: "标签",
  ChartGraph: "关系图",
  FileText: "文件",
  InboxIn: "收件箱",
  Help: "帮助",
  Info: "信息",
};

const KEYWORD_OVERRIDES: Record<string, string[]> = {
  Search: ["search", "find", "搜索"],
  Setting: ["setting", "settings", "config", "配置", "设置"],
  ListView: ["list", "outline", "列表", "大纲"],
  MenuFold: ["menu", "菜单", "导航"],
  Home: ["home", "主页", "首页"],
  Refresh: ["refresh", "sync", "刷新", "同步"],
  Plus: ["plus", "new", "add", "新建", "添加"],
  Right: ["right", "forward", "next", "前进"],
  Left: ["left", "back", "返回"],
  Bookmark: ["bookmark", "书签"],
  Tag: ["tag", "标签"],
  ChartGraph: ["graph", "chart", "关系图"],
  FileText: ["file", "document", "文件", "文档"],
  InboxIn: ["inbox", "收件箱"],
  Help: ["help", "帮助"],
  Info: ["info", "信息"],
};

const CATEGORY_RULES: Array<{ category: string; patterns: RegExp[] }> = [
  { category: "编辑", patterns: [/Text/i, /Edit/i, /Align/i, /Paragraph/i, /List/i, /Table/i, /Write/i] },
  { category: "箭头", patterns: [/Arrow/i, /Left/i, /Right/i, /Up/i, /Down/i, /Switch/i, /Transfer/i] },
  { category: "媒体", patterns: [/Play/i, /Pause/i, /Music/i, /Voice/i, /Volume/i, /Video/i, /Camera/i, /Image/i, /Pic/i] },
  { category: "文档", patterns: [/File/i, /Folder/i, /Doc/i, /Book/i, /Notebook/i, /Page/i, /Inbox/i] },
  { category: "时间", patterns: [/Time/i, /Date/i, /Calendar/i, /Clock/i, /History/i, /Alarm/i] },
  { category: "通信", patterns: [/Mail/i, /Message/i, /Phone/i, /Chat/i, /Comment/i, /Send/i] },
  { category: "用户", patterns: [/User/i, /People/i, /Person/i, /Avatar/i, /Face/i] },
  { category: "设备", patterns: [/Phone/i, /Computer/i, /Laptop/i, /Tablet/i, /Monitor/i, /Keyboard/i, /Mouse/i] },
  { category: "品牌", patterns: [/Adobe/i, /Google/i, /Apple/i, /Windows/i, /Github/i, /Wechat/i, /Weibo/i, /Youtube/i, /Instagram/i] },
  { category: "天气", patterns: [/Sun/i, /Moon/i, /Cloud/i, /Rain/i, /Snow/i, /Wind/i, /Thunder/i] },
  { category: "交通", patterns: [/Car/i, /Bus/i, /Train/i, /Plane/i, /Airplane/i, /Ship/i, /Bike/i] },
  { category: "金融", patterns: [/Wallet/i, /Bank/i, /Money/i, /Coin/i, /Payment/i, /Chart/i, /Graph/i] },
  { category: "安全", patterns: [/Lock/i, /Unlock/i, /Shield/i, /Safe/i, /Security/i, /Key/i] },
  { category: "工具", patterns: [/Tool/i, /Hammer/i, /Wrench/i, /Scissor/i, /Ruler/i, /Setting/i, /Config/i] },
  { category: "通用", patterns: [/.*/] },
];

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean);
}

function toLabel(name: string): string {
  if (LABEL_OVERRIDES[name]) {
    return LABEL_OVERRIDES[name];
  }
  return splitWords(name).join(" ");
}

function toKeywords(name: string): string[] {
  const words = splitWords(name);
  const lowerWords = words.map(word => word.toLowerCase());
  return Array.from(new Set([
    name,
    name.toLowerCase(),
    ...lowerWords,
    ...KEYWORD_OVERRIDES[name] || [],
  ]));
}

function toCategory(name: string): string {
  return CATEGORY_RULES.find(rule => rule.patterns.some(pattern => pattern.test(name)))?.category || "通用";
}

function normalizeSvg(svg: string): string {
  return svg
    .replace(/^<\?xml[^>]*\?>/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toEntry(name: string, render: IconParkExport): IconParkEntry {
  return {
    value: `iconpark:${name}`,
    name,
    label: toLabel(name),
    category: toCategory(name),
    keywords: toKeywords(name),
  };
}

async function main(): Promise<void> {
  const entries: IconParkEntry[] = [];
  const markupMap: Record<string, string> = {};

  for (const [name, value] of Object.entries(IconPark).sort(([left], [right]) => left.localeCompare(right))) {
    if (name === "default") {
      continue;
    }
    if (typeof value !== "function") {
      continue;
    }

    const render = value as IconParkExport;
    const rendered = render({
      theme: "outline",
      size: "1em",
      strokeWidth: 4,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    });
    if (typeof rendered !== "string" || !rendered.trim()) {
      continue;
    }

    const entry = toEntry(name, render);
    entries.push(entry);
    markupMap[entry.value] = normalizeSvg(rendered);
  }

  const categories = Array.from(new Set(entries.map(entry => entry.category))).sort((left, right) => left.localeCompare(right));
  const file = `/* eslint-disable */
/* auto-generated by tools/generate-iconpark-catalog.ts */

export interface IconParkIconOption {
  value: string;
  name: string;
  label: string;
  category: string;
  keywords: string[];
}

export const ICONPARK_ICON_OPTIONS: IconParkIconOption[] = ${JSON.stringify(entries, null, 2)} as IconParkIconOption[];

export const ICONPARK_CATEGORIES: string[] = ${JSON.stringify(categories, null, 2)};

export const ICONPARK_ICON_MARKUP_MAP: Record<string, string> = ${JSON.stringify(markupMap, null, 2)};
`;

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, file, "utf8");
  console.log(`Generated ${entries.length} IconPark outline icons to ${path.relative(ROOT, OUTPUT)}`);
}

void main();
