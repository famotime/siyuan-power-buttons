import type { IMenuItem } from "siyuan";
import type {
  DisabledSelectionToolbarItem,
  PowerButtonItem,
  PowerButtonsConfig,
  SelectionToolbarLayoutItem,
} from "@/shared/types";
import { CommandExecutor } from "@/core/commands";
import { getIconMarkup } from "@/core/surfaces/surface-elements";

/** 原生浮动工具栏按钮标识符 → 中文标题映射 */
export const NATIVE_TOOLBAR_BUTTON_LABELS: Record<string, string> = {
  "block-ref": "块引用",
  "a": "超链接",
  "text": "字体样式",
  "strong": "粗体",
  "em": "斜体",
  "u": "下划线",
  "s": "删除线",
  "mark": "高亮",
  "sup": "上标",
  "sub": "下标",
  "clear": "清除格式",
  "code": "行内代码",
  "kbd": "键盘标记",
  "tag": "标签",
  "inline-math": "行内公式",
  "inline-memo": "行内备注",
};

/** 所有可配置的原生按钮标识符（不含分隔符） */
export const CONFIGURABLE_NATIVE_NAMES = Object.keys(NATIVE_TOOLBAR_BUTTON_LABELS);

const DIVIDER = "|";

type ToolbarItem = string | IMenuItem;

function isDivider(item: ToolbarItem): boolean {
  return typeof item === "string" && item === DIVIDER;
}

function getItemName(item: ToolbarItem): string {
  return typeof item === "string" ? item : item.name;
}

function createLayoutKey(item: SelectionToolbarLayoutItem): string {
  return `${item.type}:${item.id}`;
}

function getCustomItemKey(item: PowerButtonItem): string {
  return createLayoutKey({ type: "custom", id: item.id });
}

function getNativeToolbarItemKey(item: ToolbarItem): string | null {
  if (isDivider(item)) {
    return null;
  }
  const name = getItemName(item);
  return name ? createLayoutKey({ type: "native", id: name }) : null;
}

/**
 * 移除首尾分隔符合并连续分隔符。
 */
export function cleanDividers(toolbar: ToolbarItem[]): ToolbarItem[] {
  let result = toolbar.filter((item, index, arr) => {
    if (!isDivider(item)) {
      return true;
    }
    // 移除连续分隔符
    if (index > 0 && isDivider(arr[index - 1])) {
      return false;
    }
    return true;
  });

  // 移除首尾分隔符
  if (result.length > 0 && isDivider(result[0])) {
    result = result.slice(1);
  }
  if (result.length > 0 && isDivider(result[result.length - 1])) {
    result = result.slice(0, -1);
  }

  return result;
}

/**
 * 自定义浮动工具栏。
 *
 * 1. 过滤掉被禁用的原生按钮
 * 2. 清理多余的分隔符
 * 3. 在末尾追加自定义按钮（如有）
 */
export function customizeSelectionToolbar(
  originalToolbar: ToolbarItem[],
  config: PowerButtonsConfig,
  executor: CommandExecutor,
): ToolbarItem[] {
  const disabledNames = new Set<string>(
    config.disabledSelectionToolbarItems.map(item => item.name),
  );

  // 过滤被禁用的原生按钮
  const filtered = originalToolbar.filter(item => {
    const name = getItemName(item);
    return !disabledNames.has(name);
  });

  // 清理多余分隔符
  let toolbar = cleanDividers(filtered);

  // 插入自定义按钮
  const customItems = config.items
    .filter(item => item.surface === "selection-toolbar" && item.visible)
    .sort((a, b) => a.order - b.order);

  if (config.selectionToolbarLayout.length > 0) {
    const nativeByKey = new Map<string, ToolbarItem>();
    const nativeOrder: string[] = [];
    for (const item of toolbar) {
      const key = getNativeToolbarItemKey(item);
      if (!key) {
        continue;
      }
      nativeByKey.set(key, item);
      nativeOrder.push(key);
    }

    const customByKey = new Map(customItems.map(item => [getCustomItemKey(item), item]));
    const ordered: ToolbarItem[] = [];
    const usedKeys = new Set<string>();

    for (const layoutItem of config.selectionToolbarLayout) {
      const key = createLayoutKey(layoutItem);
      if (usedKeys.has(key)) {
        continue;
      }

      const nativeItem = nativeByKey.get(key);
      if (nativeItem) {
        ordered.push(nativeItem);
        usedKeys.add(key);
        continue;
      }

      const customItem = customByKey.get(key);
      if (customItem) {
        ordered.push(createMenuItem(customItem, executor));
        usedKeys.add(key);
      }
    }

    for (const key of nativeOrder) {
      if (!usedKeys.has(key)) {
        ordered.push(nativeByKey.get(key)!);
        usedKeys.add(key);
      }
    }

    for (const item of customItems) {
      const key = getCustomItemKey(item);
      if (!usedKeys.has(key)) {
        ordered.push(createMenuItem(item, executor));
        usedKeys.add(key);
      }
    }

    return cleanDividers(ordered);
  }

  if (customItems.length > 0) {
    // 在自定义按钮前添加分隔符，与原生按钮区分开
    if (toolbar.length > 0) {
      toolbar.push(DIVIDER);
    }

    for (const item of customItems) {
      toolbar.push(createMenuItem(item, executor));
    }
  }

  return toolbar;
}

/**
 * 构建原生按钮的默认禁用列表（空列表，即全部启用）。
 */
export function createDefaultDisabledSelectionToolbarItems(): DisabledSelectionToolbarItem[] {
  return [];
}

/**
 * 根据当前配置判断某个原生按钮是否被禁用。
 */
export function isNativeButtonDisabled(
  name: string,
  disabledItems: DisabledSelectionToolbarItem[],
): boolean {
  return disabledItems.some(item => item.name === name);
}

function createMenuItem(item: PowerButtonItem, executor: CommandExecutor): IMenuItem {
  return {
    name: `power-buttons:${item.id}`,
    icon: getIconMarkup(item),
    tip: item.tooltip || item.title,
    click: () => {
      void executor.execute(item);
    },
  };
}
