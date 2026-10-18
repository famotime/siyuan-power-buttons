import { getPinyinInitials } from '@/core/plugins/pinyin';
import type { DiscoveredPluginEntry } from '@/core/plugins/types';

export type SiyuanPluginLike = {
  name?: string;
  displayName?: string;
  setting?: unknown;
  openSetting?: () => void;
  topBarIcons?: Element[];
  commands?: Array<{
    langKey?: string;
    langText?: string;
    callback?: () => void;
    hotkey?: string;
  }>;
};

function extractTopBarIcon(element: Element): { iconType: 'svg' | 'iconpark'; iconValue: string } {
  const svg = element.querySelector('svg');
  if (svg) {
    const use = svg.querySelector('use');
    const href = use?.getAttribute('xlink:href') || use?.getAttribute('href');
    if (href && href.startsWith('#')) {
      const symbolId = href.slice(1);
      if (symbolId) {
        return { iconType: 'svg', iconValue: symbolId };
      }
    }
    return { iconType: 'svg', iconValue: svg.outerHTML };
  }
  return { iconType: 'iconpark', iconValue: 'iconpark:ApplicationMenu' };
}

export function scanPluginEntries(plugins: SiyuanPluginLike[] | undefined): DiscoveredPluginEntry[] {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return [];
  }

  const entries: DiscoveredPluginEntry[] = [];
  const seenIds = new Set<string>();

  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== 'object') continue;
    const pluginName = plugin.name?.trim();
    if (!pluginName) continue;

    const pluginDisplayName = plugin.displayName?.trim() || pluginName;

    // 1. 扫描配置入口 (Setting)
    const hasSetting = typeof plugin.openSetting === 'function'
      || (plugin.setting !== undefined && plugin.setting !== null);
    if (hasSetting) {
      const id = `plugin-entry:setting:${pluginName}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const title = `${pluginDisplayName} 设置`;
        entries.push({
          id,
          pluginName,
          pluginDisplayName,
          type: 'setting',
          title,
          description: `打开 ${pluginDisplayName} 的配置界面`,
          iconType: 'iconpark',
          iconValue: 'iconpark:SettingTwo',
          actionType: 'plugin-command',
          actionId: `plugin-setting:${pluginName}`,
          initials: getPinyinInitials(`${title} ${pluginName}`),
        });
      }
    }

    // 2. 扫描顶栏图标 (TopBar)
    if (Array.isArray(plugin.topBarIcons)) {
      plugin.topBarIcons.forEach((el, index) => {
        if (!el || typeof el.getAttribute !== 'function') return;
        const attrId = el.getAttribute('data-id') || el.id || String(index);
        const title = el.getAttribute('aria-label') || el.getAttribute('title') || `${pluginDisplayName} 顶栏入口`;
        const id = `plugin-entry:topbar:${pluginName}__${attrId}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const { iconType, iconValue } = extractTopBarIcon(el);
          entries.push({
            id,
            pluginName,
            pluginDisplayName,
            type: 'topbar',
            title,
            description: `${pluginDisplayName} 顶栏按钮`,
            iconType,
            iconValue,
            actionType: 'plugin-command',
            actionId: `plugin-topbar:${pluginName}__${attrId}`,
            initials: getPinyinInitials(`${title} ${pluginDisplayName} ${pluginName}`),
          });
        }
      });
    }

    // 3. 扫描已注册命令 (Commands)
    if (Array.isArray(plugin.commands)) {
      plugin.commands.forEach((cmd, index) => {
        if (!cmd) return;
        const cmdKey = cmd.langKey?.trim() || String(index);
        const title = cmd.langText?.trim() || cmdKey;
        const id = `plugin-entry:command:${pluginName}__${cmdKey}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          entries.push({
            id,
            pluginName,
            pluginDisplayName,
            type: 'command',
            title,
            description: `${pluginDisplayName} 命令`,
            iconType: 'iconpark',
            iconValue: 'iconpark:Terminal',
            actionType: 'plugin-command',
            actionId: `plugin-cmd:${pluginName}__${cmdKey}`,
            initials: getPinyinInitials(`${title} ${pluginDisplayName} ${pluginName}`),
          });
        }
      });
    }
  }

  // 排序：先按插件名，再按类型 (setting -> topbar -> command)
  const typeOrder: Record<string, number> = { setting: 1, topbar: 2, command: 3 };
  return entries.sort((a, b) => {
    const comp = a.pluginDisplayName.localeCompare(b.pluginDisplayName, 'zh-CN');
    if (comp !== 0) return comp;
    return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
  });
}
