import { getPinyinInitials } from '@/core/plugins/pinyin';
import type { DiscoveredPluginEntry } from '@/core/plugins/types';

export type InstalledPluginPackage = {
  name: string;
  displayName?: string | Record<string, string>;
  preferredName?: string;
  enabled?: boolean;
  version?: string;
};

export type SiyuanPluginLike = {
  name?: string;
  displayName?: string | Record<string, string>;
  setting?: unknown;
  openSetting?: () => void;
  topBarIcons?: Element[];
  commands?: Array<{
    langKey?: string;
    langText?: string;
    callback?: () => void;
    hotkey?: string;
  }>;
  docks?: Record<string, {
    id?: string;
    config?: {
      title?: string;
      icon?: string;
      position?: string;
      hotkey?: string;
    };
  }>;
};

/**
 * 安全解析插件显示名称（支持多语言字典对象或单字符串）
 */
export function resolveDisplayName(displayName: unknown, fallback = ''): string {
  if (typeof displayName === 'string') {
    const trimmed = displayName.trim();
    return trimmed || fallback;
  }
  if (displayName && typeof displayName === 'object') {
    const record = displayName as Record<string, unknown>;
    const currentLang = typeof window !== 'undefined'
      ? (window as any).siyuan?.config?.appearance?.lang
      : undefined;
    if (currentLang && typeof record[currentLang] === 'string' && (record[currentLang] as string).trim()) {
      return (record[currentLang] as string).trim();
    }
    for (const key of ['zh_CN', 'zh_Hans', 'en_US', 'default']) {
      if (typeof record[key] === 'string' && (record[key] as string).trim()) {
        return (record[key] as string).trim();
      }
    }
    for (const val of Object.values(record)) {
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
  }
  return fallback;
}

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

function extractDockIcon(icon: unknown): { iconType: 'svg' | 'iconpark'; iconValue: string } {
  if (typeof icon === 'string') {
    const trimmed = icon.trim();
    if (trimmed.startsWith('<svg') && trimmed.endsWith('</svg>')) {
      return { iconType: 'svg', iconValue: trimmed };
    }
    if (trimmed.startsWith('#')) {
      const symbolId = trimmed.slice(1).trim();
      if (symbolId) {
        return { iconType: 'svg', iconValue: symbolId };
      }
    }
    if (trimmed) {
      return { iconType: 'svg', iconValue: trimmed };
    }
  }
  return { iconType: 'iconpark', iconValue: 'iconpark:Dock' };
}

export function scanPluginEntries(
  plugins: SiyuanPluginLike[] | undefined,
  installedPackages?: InstalledPluginPackage[],
): DiscoveredPluginEntry[] {
  const activePlugins = Array.isArray(plugins) ? plugins : [];
  if (activePlugins.length === 0 && (!installedPackages || installedPackages.length === 0)) {
    return [];
  }

  const entries: DiscoveredPluginEntry[] = [];
  const seenIds = new Set<string>();
  const activePluginNames = new Set<string>();

  for (const plugin of activePlugins) {
    if (!plugin || typeof plugin !== 'object') continue;
    const pluginName = typeof plugin.name === 'string' ? plugin.name.trim() : '';
    if (!pluginName) continue;

    activePluginNames.add(pluginName);
    const pluginDisplayName = resolveDisplayName(plugin.displayName, pluginName);

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
          enabled: true,
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
            enabled: true,
          });
        }
      });
    }

    // 3. 扫描侧栏图标 (Docks)
    if (plugin.docks && typeof plugin.docks === 'object') {
      Object.entries(plugin.docks).forEach(([dockKey, dockObj]) => {
        if (!dockObj || typeof dockObj !== 'object') return;
        const dockConfig = (dockObj as any).config || {};
        const title = (typeof dockConfig.title === 'string' && dockConfig.title.trim())
          ? dockConfig.title.trim()
          : `${pluginDisplayName} 侧栏入口`;
        const id = `plugin-entry:dock:${pluginName}__${dockKey}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const { iconType, iconValue } = extractDockIcon(dockConfig.icon);
          entries.push({
            id,
            pluginName,
            pluginDisplayName,
            type: 'dock',
            title,
            description: `${pluginDisplayName} 侧栏按钮`,
            iconType,
            iconValue,
            actionType: 'plugin-command',
            actionId: `plugin-dock:${pluginName}__${dockKey}`,
            initials: getPinyinInitials(`${title} ${pluginDisplayName} ${pluginName}`),
            enabled: true,
          });
        }
      });
    }

    // 4. 扫描已注册命令 (Commands)
    if (Array.isArray(plugin.commands)) {
      plugin.commands.forEach((cmd, index) => {
        if (!cmd || typeof cmd !== 'object') return;
        const cmdKey = typeof cmd.langKey === 'string' && cmd.langKey.trim() ? cmd.langKey.trim() : String(index);
        const title = typeof cmd.langText === 'string' && cmd.langText.trim() ? cmd.langText.trim() : cmdKey;
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
            enabled: true,
          });
        }
      });
    }
  }

  // 5. 补充扫描已安装但处于停用状态的插件
  if (Array.isArray(installedPackages)) {
    for (const pkg of installedPackages) {
      if (!pkg || typeof pkg !== 'object') continue;
      const pluginName = typeof pkg.name === 'string' ? pkg.name.trim() : '';
      if (!pluginName) continue;
      const isEnabled = pkg.enabled ?? activePluginNames.has(pluginName);
      if (!isEnabled || !activePluginNames.has(pluginName)) {
        const id = `plugin-entry:topbar:${pluginName}__main`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const pluginDisplayName = (typeof pkg.preferredName === 'string' && pkg.preferredName.trim())
            ? pkg.preferredName.trim()
            : resolveDisplayName(pkg.displayName, pluginName);
          const title = pluginDisplayName;
          entries.push({
            id,
            pluginName,
            pluginDisplayName,
            type: 'topbar',
            title,
            description: `${pluginDisplayName} 顶栏入口`,
            iconType: 'iconpark',
            iconValue: 'iconpark:ApplicationMenu',
            actionType: 'plugin-command',
            actionId: `plugin-topbar:${pluginName}__main`,
            initials: getPinyinInitials(`${title} ${pluginName}`),
            enabled: false,
          });
        }
      }
    }
  }

  // 排序：先按插件名，再按类型 (setting -> topbar -> dock -> command)
  const typeOrder: Record<string, number> = { setting: 1, topbar: 2, dock: 3, command: 4 };
  return entries.sort((a, b) => {
    const comp = a.pluginDisplayName.localeCompare(b.pluginDisplayName, 'zh-CN');
    if (comp !== 0) return comp;
    return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
  });
}
