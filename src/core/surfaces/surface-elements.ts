import type { Dock, Plugin } from 'siyuan';
import { DEFAULT_ICONPARK_ICON, DEFAULT_PLUGIN_COMMAND, PLUGIN_ENTRY_DIVIDER_ID } from '@/shared/constants';
import { hardenStrokeOnlySvgFill, renderIconMarkup } from '@/shared/icon-renderer';
import type { PowerButtonItem } from '@/shared/types';
import { getDockCardColorStyle, PRESET_COLORS } from '@/shared/color-utils';
import { CommandExecutor } from '@/core/commands';
import type { CanvasMountTarget } from '@/core/surfaces/canvas-mount-target';
import type { DiscoveredPluginEntry } from '@/core/plugins/types';
import { matchKeyword } from '@/core/plugins/pinyin';

export type DockRegistration = {
  type: string;
  model: unknown;
};

export function hasDockRemove(model: unknown): model is Pick<Dock, 'remove'> {
  return typeof (model as { remove?: unknown } | null | undefined)?.remove === 'function';
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createIconSvg(icon: string): string {
  if (icon.trim().startsWith('<svg')) {
    return hardenStrokeOnlySvgFill(icon);
  }
  return renderIconMarkup({
    iconType: 'iconpark',
    iconValue: icon,
  }, document);
}

function createEmojiSvg(emoji: string): string {
  const safeEmoji = escapeAttribute(emoji || '⚙');
  return `<svg viewBox="0 0 24 24" class="siyuan-power-buttons__icon" aria-hidden="true"><text x="12" y="17" text-anchor="middle" font-size="15">${safeEmoji}</text></svg>`;
}

export function getIconMarkup(item: PowerButtonItem): string {
  if (item.iconType === 'emoji') {
    return createEmojiSvg(item.iconValue);
  }
  if (item.iconType === 'svg') {
    return item.iconValue.trim() ? createIconSvg(item.iconValue) : createIconSvg(DEFAULT_ICONPARK_ICON);
  }
  return createIconSvg(item.iconValue || DEFAULT_ICONPARK_ICON);
}

export function createStatusElement(item: PowerButtonItem, executor: CommandExecutor): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'siyuan-power-buttons__button';
  button.title = item.tooltip || item.title;
  button.setAttribute('aria-label', item.tooltip || item.title);
  button.dataset.powerButtonsOwned = 'true';
  button.dataset.powerButtonsItemId = item.id;
  button.innerHTML = getIconMarkup(item);
  button.addEventListener('click', () => {
    void executor.execute(item);
  });
  return button;
}

export function createCanvasElement(
  item: PowerButtonItem,
  executor: CommandExecutor,
  kind: CanvasMountTarget['kind'],
): HTMLElement {
  const element = createStatusElement(item, executor);
  if (kind === 'breadcrumb') {
    element.classList.add('protyle-breadcrumb__icon');
  } else {
    element.classList.add('block__icon', 'block__icon--show');
  }
  return element;
}

export function createFixedSettingsTopbar(plugin: Plugin, executor: CommandExecutor): HTMLElement {
  const element = plugin.addTopBar({
    icon: createIconSvg('iconpark:AsteriskKey'),
    title: '随心按',
    callback: () => {
      void executor.execute({
        actionType: 'plugin-command',
        actionId: DEFAULT_PLUGIN_COMMAND,
      });
    },
  });
  element.dataset.powerButtonsOwned = 'true';
  element.dataset.powerButtonsItemId = 'fixed-open-settings';
  return element;
}

export function createDockPanel(item: PowerButtonItem, executor: CommandExecutor, host: HTMLElement): void {
  host.innerHTML = `
    <div class="siyuan-power-buttons__dock-panel">
      <div class="siyuan-power-buttons__dock-header">
        ${getIconMarkup(item)}
          <div>
          <div class="siyuan-power-buttons__dock-title">${item.title}</div>
          <div class="siyuan-power-buttons__dock-description">${item.tooltip || '执行当前按钮绑定的动作'}</div>
        </div>
      </div>
      <button type="button" class="b3-button b3-button--outline siyuan-power-buttons__dock-action">执行动作</button>
    </div>
  `;
  host.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-action')?.addEventListener('click', () => {
    void executor.execute(item);
  });
}

export type DockPanelEntry =
  | { type: 'button'; item: PowerButtonItem }
  | { type: 'divider'; id: string; title?: string };

function isPluginEntryDivider(entry: DockPanelEntry): boolean {
  return entry.type === 'divider' && (
    entry.id === PLUGIN_ENTRY_DIVIDER_ID
    || entry.title === '插件入口'
    || entry.title === 'Plugin Shortcuts'
  );
}

function getCollapseIconSvg(collapsed: boolean): string {
  return collapsed
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="siyuan-power-buttons__icon"><path d="m9 18 6-6-6-6"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="siyuan-power-buttons__icon"><path d="m6 9 6 6 6-6"/></svg>`;
}

let lastInteractedActionId: string | null = null;

function createPluginSearchSection(
  pluginEntries: DiscoveredPluginEntry[],
  pinnedActionIds: Set<string>,
  initialCollapsed: boolean,
  initialQuery: string,
  executor: CommandExecutor,
  i18n: Record<string, string | undefined>,
  handlers: {
    onTogglePin?: (entry: DiscoveredPluginEntry) => void | Promise<void>;
    onToggleCollapse?: (collapsed: boolean) => void | Promise<void>;
    onSearchQueryChange?: (query: string) => void;
    onTogglePluginEnabled?: (pluginName: string, enabled: boolean) => Promise<boolean | void> | boolean | void;
    onToggleGroupExpanded?: (pluginName: string, expanded: boolean) => void | Promise<void>;
  },
  sectionOptions: {
    isPluginEnabled?: (pluginName: string) => boolean;
    initialExpandedPluginGroups?: string[];
  } = {},
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'siyuan-power-buttons__dock-plugin-section';

  let isCollapsed = initialCollapsed;
  let currentQuery = initialQuery;

  const searchPlaceholder = i18n.searchPluginsPlaceholder || '搜索插件名称、按钮或命令...';
  const foldLabel = i18n.foldPluginList || '折叠插件列表';
  const expandLabel = i18n.expandPluginList || '展开插件列表';
  const getCollapseLabel = (collapsed: boolean) => (collapsed ? expandLabel : foldLabel);
  const noPluginsFound = i18n.noPluginsFound || '未找到匹配的插件功能';
  const pinLabel = i18n.pinToDock || '设为右侧栏常驻';
  const unpinLabel = i18n.unpinFromDock || '取消右侧栏常驻';
  const enablePluginLabel = i18n.enablePlugin || '启用插件';
  const disablePluginLabel = i18n.disablePlugin || '停用插件';
  const expandGroupLabel = i18n.expandPluginGroup || '展开插件命令';
  const collapseGroupLabel = i18n.collapsePluginGroup || '折叠插件命令';
  const groupCountTooltipSuffix = i18n.pluginGroupCountSuffix || '项命令';
  const badgeLabels: Record<string, string> = {
    setting: i18n.badgeSetting || '配置',
    topbar: i18n.badgeTopBar || '顶栏',
    command: i18n.badgeCommand || '命令',
    dock: i18n.badgeDock || '侧栏',
  };

  const searchIcon = createIconSvg('iconpark:Search');
  const closeIcon = createIconSvg('iconpark:CloseSmall') || '✕';
  const pushpinIcon = createIconSvg('iconpark:Pushpin');

  const searchBar = document.createElement('div');
  searchBar.className = 'siyuan-power-buttons__dock-plugin-search-bar';
  searchBar.innerHTML = `
    <div class="siyuan-power-buttons__dock-plugin-input-wrap">
      <span class="siyuan-power-buttons__dock-plugin-search-icon">${searchIcon}</span>
      <input type="text" class="b3-text-field b3-text-field--text siyuan-power-buttons__dock-plugin-input" placeholder="${escapeAttribute(searchPlaceholder)}" value="${escapeAttribute(currentQuery)}">
      <button type="button" class="siyuan-power-buttons__dock-plugin-clear-btn ${currentQuery ? '' : 'fn__none'}" aria-label="清空">${closeIcon}</button>
    </div>
    <button type="button" class="block__icon block__icon--show b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-plugin-collapse-btn ${isCollapsed ? 'is-collapsed' : ''}" aria-label="${escapeAttribute(getCollapseLabel(isCollapsed))}">
      ${getCollapseIconSvg(isCollapsed)}
    </button>
  `;

  const inputEl = searchBar.querySelector<HTMLInputElement>('.siyuan-power-buttons__dock-plugin-input')!;
  const clearBtn = searchBar.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-clear-btn')!;
  const collapseBtn = searchBar.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-collapse-btn')!;

  const resultsContainer = document.createElement('div');
  resultsContainer.className = `siyuan-power-buttons__dock-plugin-results ${isCollapsed ? 'fn__none' : ''}`;

  // 按插件分组的展开状态：记录用户显式展开过的插件名，未记录的默认折叠
  const expandedGroups = new Set<string>(sectionOptions.initialExpandedPluginGroups ?? []);
  // 停用插件只生成一张占位卡（无子项可分组），保持平铺渲染
  const isDisabledPlaceholderEntry = (entry: DiscoveredPluginEntry) =>
    entry.actionId === `plugin-topbar:${entry.pluginName}__main`;

  const buildToggleMarkup = (pluginName: string, isPluginEnabled: boolean): string => `
    <label class="b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-plugin-toggle-wrapper"
           aria-label="${escapeAttribute(isPluginEnabled ? disablePluginLabel : enablePluginLabel)}">
      <input type="checkbox"
             class="b3-switch siyuan-power-buttons__dock-plugin-toggle-switch"
             ${isPluginEnabled ? 'checked' : ''}
             data-plugin-name="${escapeAttribute(pluginName)}">
    </label>
  `;

  const bindToggleHandlers = (
    scopeEl: HTMLElement,
    pluginName: string,
    interactionActionId: string,
    onEnabledChange: (disabled: boolean) => void,
  ): void => {
    const toggleSwitch = scopeEl.querySelector<HTMLInputElement>('.siyuan-power-buttons__dock-plugin-toggle-switch');
    const toggleLabel = scopeEl.querySelector<HTMLLabelElement>('.siyuan-power-buttons__dock-plugin-toggle-wrapper');

    toggleLabel?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    toggleSwitch?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    toggleSwitch?.addEventListener('change', async (e) => {
      e.stopPropagation();
      lastInteractedActionId = interactionActionId;
      const targetEnabled = toggleSwitch.checked;
      toggleSwitch.disabled = true;
      try {
        const res = await handlers.onTogglePluginEnabled?.(pluginName, targetEnabled);
        if (res === false) {
          toggleSwitch.checked = !targetEnabled;
        }
      } catch {
        toggleSwitch.checked = !targetEnabled;
      } finally {
        toggleSwitch.disabled = false;
        const currentChecked = toggleSwitch.checked;
        toggleLabel?.setAttribute('aria-label', currentChecked ? disablePluginLabel : enablePluginLabel);
        onEnabledChange(!currentChecked);
      }
    });
  };

  const createPluginEntryCard = (entry: DiscoveredPluginEntry, cardOptions: { includeToggle: boolean }): HTMLElement => {
    const isPinned = pinnedActionIds.has(entry.actionId);
    const isPluginEnabled = sectionOptions.isPluginEnabled
      ? sectionOptions.isPluginEnabled(entry.pluginName)
      : (entry.enabled ?? true);

    const hasToggleSwitch = cardOptions.includeToggle && (entry.type === 'topbar' || entry.type === 'dock');

    const card = document.createElement('div');
    card.className = `siyuan-power-buttons__dock-plugin-card ${isPinned ? 'is-pinned' : ''} ${isPluginEnabled ? '' : 'is-disabled-plugin'}`;
    card.dataset.actionId = entry.actionId;
    card.dataset.pluginName = entry.pluginName;
    card.innerHTML = `
      <div class="siyuan-power-buttons__dock-plugin-icon">${getIconMarkup(entry as any)}</div>
      <div class="siyuan-power-buttons__dock-plugin-info">
        <div class="siyuan-power-buttons__dock-plugin-row-top">
          <span class="siyuan-power-buttons__dock-plugin-title">${escapeAttribute(entry.title)}</span>
          <span class="siyuan-power-buttons__dock-plugin-badge is-${entry.type}">${escapeAttribute(badgeLabels[entry.type] || entry.type)}</span>
        </div>
      </div>
      <div class="siyuan-power-buttons__dock-plugin-actions">
        ${hasToggleSwitch ? buildToggleMarkup(entry.pluginName, isPluginEnabled) : ''}
        <button type="button" class="siyuan-power-buttons__dock-plugin-pin-btn b3-tooltips b3-tooltips__sw ${isPinned ? 'is-pinned' : ''}" aria-label="${escapeAttribute(isPinned ? unpinLabel : pinLabel)}">
          ${pushpinIcon}
        </button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      e.stopPropagation();
      void executor.execute({
        actionType: entry.actionType,
        actionId: entry.actionId,
      } as any);
    });

    card.querySelector('.siyuan-power-buttons__dock-plugin-pin-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      lastInteractedActionId = entry.actionId;
      handlers.onTogglePin?.(entry);
    });

    if (hasToggleSwitch) {
      bindToggleHandlers(card, entry.pluginName, entry.actionId, (disabled) => {
        card.classList.toggle('is-disabled-plugin', disabled);
      });
    }

    return card;
  };

  const createPluginGroupCard = (
    group: { pluginName: string; pluginDisplayName: string; entries: DiscoveredPluginEntry[] },
    groupOptions: { forceExpanded: boolean },
  ): HTMLElement => {
    const commandCount = group.entries.filter(entry => entry.type === 'command').length;
    const hasCommands = commandCount > 0;
    // 搜索过滤时渲染出来的组必然含命中项，强制展开以便看到匹配子项
    const isExpanded = !hasCommands || groupOptions.forceExpanded || expandedGroups.has(group.pluginName);
    // 卡头启停开关与图标取该插件的顶栏/侧栏入口（去重后只需一个），取不到时用统一插件图标
    const toggleEntry = group.entries.find(entry => entry.type === 'topbar' || entry.type === 'dock');
    const iconEntry = toggleEntry;
    const isPluginEnabled = sectionOptions.isPluginEnabled
      ? sectionOptions.isPluginEnabled(group.pluginName)
      : (toggleEntry?.enabled ?? true);

    const groupEl = document.createElement('div');
    groupEl.className = `siyuan-power-buttons__dock-plugin-group ${isPluginEnabled ? '' : 'is-disabled-plugin'}`;
    groupEl.dataset.pluginName = group.pluginName;

    const header = document.createElement('div');
    header.className = 'siyuan-power-buttons__dock-plugin-card siyuan-power-buttons__dock-plugin-group-header';
    header.dataset.pluginName = group.pluginName;
    header.setAttribute('aria-expanded', String(isExpanded));
    if (hasCommands) {
      header.setAttribute('aria-label', isExpanded ? collapseGroupLabel : expandGroupLabel);
    }
    header.innerHTML = `
      <div class="siyuan-power-buttons__dock-plugin-icon">${getIconMarkup({
        iconType: iconEntry?.iconType ?? 'iconpark',
        iconValue: iconEntry?.iconValue ?? 'iconpark:ApplicationMenu',
      } as any)}</div>
      <div class="siyuan-power-buttons__dock-plugin-info">
        <div class="siyuan-power-buttons__dock-plugin-row-top">
          <span class="siyuan-power-buttons__dock-plugin-name siyuan-power-buttons__dock-plugin-group-name">${escapeAttribute(group.pluginDisplayName)}</span>
          ${hasCommands ? `<span class="siyuan-power-buttons__dock-plugin-group-count" title="${commandCount} ${escapeAttribute(groupCountTooltipSuffix)}">${commandCount}</span>` : ''}
        </div>
      </div>
      <div class="siyuan-power-buttons__dock-plugin-actions">
        ${toggleEntry ? buildToggleMarkup(group.pluginName, isPluginEnabled) : ''}
        ${hasCommands ? `<span class="siyuan-power-buttons__dock-plugin-group-chevron">${getCollapseIconSvg(!isExpanded)}</span>` : ''}
      </div>
    `;

    const childrenEl = document.createElement('div');
    childrenEl.className = `siyuan-power-buttons__dock-plugin-group-children ${isExpanded ? '' : 'fn__none'}`;
    group.entries.forEach(entry => {
      childrenEl.appendChild(createPluginEntryCard(entry, { includeToggle: false }));
    });

    if (hasCommands) {
      const applyGroupExpanded = (expanded: boolean): void => {
        childrenEl.classList.toggle('fn__none', !expanded);
        const chevronEl = header.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-chevron');
        if (chevronEl) {
          chevronEl.innerHTML = getCollapseIconSvg(!expanded);
        }
        header.setAttribute('aria-expanded', String(expanded));
        header.setAttribute('aria-label', expanded ? collapseGroupLabel : expandGroupLabel);
      };

      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextExpanded = !expandedGroups.has(group.pluginName);
        if (nextExpanded) {
          expandedGroups.add(group.pluginName);
        } else {
          expandedGroups.delete(group.pluginName);
        }
        applyGroupExpanded(nextExpanded);
        handlers.onToggleGroupExpanded?.(group.pluginName, nextExpanded);
      });
    } else {
      header.style.cursor = 'default';
    }

    if (toggleEntry) {
      bindToggleHandlers(header, group.pluginName, toggleEntry.actionId, (disabled) => {
        groupEl.classList.toggle('is-disabled-plugin', disabled);
      });
    }

    groupEl.appendChild(header);
    groupEl.appendChild(childrenEl);
    return groupEl;
  };

  const renderResults = (query: string) => {
    resultsContainer.innerHTML = '';
    const q = query.trim();
    const filtered = q
      ? pluginEntries.filter(entry =>
          matchKeyword(entry.title, q, entry.initials)
          || matchKeyword(entry.pluginDisplayName, q, entry.initials)
          || matchKeyword(entry.pluginName, q)
          || (entry.description && matchKeyword(entry.description, q)),
        )
      : pluginEntries;

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'siyuan-power-buttons__dock-plugin-empty';
      empty.textContent = noPluginsFound;
      resultsContainer.appendChild(empty);
      return;
    }

    // 按插件名归类，保持扫描排序（插件名 -> 类型）的先后顺序；
    // 搜索命中插件名时该插件所有 entry 都会命中 pluginDisplayName，整组自然全部保留
    type PluginResultGroup = { kind: 'group'; pluginName: string; pluginDisplayName: string; entries: DiscoveredPluginEntry[] };
    type PluginResultItem = PluginResultGroup | { kind: 'flat'; entry: DiscoveredPluginEntry };

    const resultItems: PluginResultItem[] = [];
    const groupByPlugin = new Map<string, PluginResultGroup>();

    filtered.forEach(entry => {
      if (isDisabledPlaceholderEntry(entry)) {
        resultItems.push({ kind: 'flat', entry });
        return;
      }
      const existingGroup = groupByPlugin.get(entry.pluginName);
      if (existingGroup) {
        existingGroup.entries.push(entry);
      } else {
        const group: PluginResultGroup = {
          kind: 'group',
          pluginName: entry.pluginName,
          pluginDisplayName: entry.pluginDisplayName,
          entries: [entry],
        };
        groupByPlugin.set(entry.pluginName, group);
        resultItems.push(group);
      }
    });

    resultItems.forEach(resultItem => {
      if (resultItem.kind === 'flat') {
        resultsContainer.appendChild(createPluginEntryCard(resultItem.entry, { includeToggle: true }));
      } else {
        resultsContainer.appendChild(createPluginGroupCard(resultItem, { forceExpanded: Boolean(q) }));
      }
    });
  };

  inputEl.addEventListener('input', () => {
    currentQuery = inputEl.value;
    clearBtn.classList.toggle('fn__none', !currentQuery);
    handlers.onSearchQueryChange?.(currentQuery);
    renderResults(currentQuery);
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    inputEl.value = '';
    currentQuery = '';
    clearBtn.classList.add('fn__none');
    handlers.onSearchQueryChange?.('');
    renderResults('');
    inputEl.focus();
  });

  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isCollapsed = !isCollapsed;
    collapseBtn.classList.toggle('is-collapsed', isCollapsed);
    collapseBtn.innerHTML = getCollapseIconSvg(isCollapsed);
    collapseBtn.setAttribute('aria-label', getCollapseLabel(isCollapsed));
    resultsContainer.classList.toggle('fn__none', isCollapsed);
    if (!isCollapsed && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const contentEl = container.closest('.siyuan-power-buttons__dock-content') as HTMLElement;
        if (contentEl) {
          const contentRect = contentEl.getBoundingClientRect();
          const resultsRect = resultsContainer.getBoundingClientRect();
          const available = contentRect.bottom - resultsRect.top - 12;
          if (contentRect.height > 0 && available > 0) {
            resultsContainer.style.maxHeight = `${Math.max(160, Math.floor(available))}px`;
          }
        }
      });
    }
    handlers.onToggleCollapse?.(isCollapsed);
  });

  renderResults(currentQuery);

  container.appendChild(searchBar);
  container.appendChild(resultsContainer);
  return container;
}


const POPUP_QUICK_ICONS = [
  { type: 'iconpark' as const, value: 'iconpark:Star', label: '星标' },
  { type: 'iconpark' as const, value: 'iconpark:Heart', label: '喜爱' },
  { type: 'iconpark' as const, value: 'iconpark:Bookmark', label: '书签' },
  { type: 'iconpark' as const, value: 'iconpark:CheckOne', label: '完成' },
  { type: 'iconpark' as const, value: 'iconpark:SettingTwo', label: '设置' },
  { type: 'iconpark' as const, value: 'iconpark:Lightning', label: '快捷' },
  { type: 'iconpark' as const, value: 'iconpark:Fire', label: '重点' },
  { type: 'iconpark' as const, value: 'iconpark:Search', label: '搜索' },
  { type: 'iconpark' as const, value: 'iconpark:FileText', label: '文档' },
  { type: 'iconpark' as const, value: 'iconpark:Folder', label: '目录' },
  { type: 'iconpark' as const, value: 'iconpark:Tag', label: '标签' },
  { type: 'iconpark' as const, value: 'iconpark:Tool', label: '工具' },
];


let activeDockResizeObserver: ResizeObserver | null = null;

export function disconnectDockResizeObserver(): void {
  if (activeDockResizeObserver) {
    activeDockResizeObserver.disconnect();
    activeDockResizeObserver = null;
  }
}

let activeAppearancePopover: HTMLElement | null = null;
let activePopoverCleanup: (() => void) | null = null;

export function closeActiveAppearancePopover(): void {
  if (activePopoverCleanup) {
    activePopoverCleanup();
    activePopoverCleanup = null;
  }
  if (activeAppearancePopover) {
    activeAppearancePopover.remove();
    activeAppearancePopover = null;
  }
}

function showCardAppearancePopover(
  cardEl: HTMLElement,
  item: PowerButtonItem,
  onOpenSettings: () => void,
  i18n: Record<string, string | undefined>,
  handlers: {
    onUpdateItemAppearance?: (itemId: string, patch: { color?: string; iconType?: PowerButtonItem['iconType']; iconValue?: string }) => void | Promise<void>;
  },
): void {
  closeActiveAppearancePopover();

  const title = i18n.editAppearance || '修改外观';
  const cardColorLabel = i18n.cardColor || '侧栏卡片颜色';
  const defaultColorLabel = i18n.defaultColor || '默认无色';
  const customColorLabel = i18n.customColor || '自定义颜色';
  const changeIconLabel = i18n.changeIcon || '更换图标';
  const moreSettingsLabel = i18n.moreSettings || '更多设置...';
  const closeIcon = createIconSvg('iconpark:CloseSmall') || '✕';

  const popover = document.createElement('div');
  popover.className = 'siyuan-power-buttons__appearance-popover';

  let currentColor = item.color;

  popover.innerHTML = `
    <div class="siyuan-power-buttons__popover-header">
      <span class="siyuan-power-buttons__popover-title">${escapeAttribute(title)}</span>
      <button type="button" class="siyuan-power-buttons__popover-close-btn" aria-label="关闭">${closeIcon}</button>
    </div>
    <div class="siyuan-power-buttons__popover-section">
      <div class="siyuan-power-buttons__popover-label">${escapeAttribute(cardColorLabel)}</div>
      <div class="siyuan-power-buttons__popover-colors">
        <button type="button" class="siyuan-power-buttons__color-dot is-none ${!currentColor ? 'is-active' : ''}" title="${escapeAttribute(defaultColorLabel)}" data-color="none">
          <span class="dot-none-line"></span>
        </button>
        ${PRESET_COLORS.map(c => `
          <button type="button" class="siyuan-power-buttons__color-dot ${currentColor?.toLowerCase() === c.hex.toLowerCase() ? 'is-active' : ''}"
                  style="background-color: ${c.hex};"
                  data-color="${c.hex}"
                  title="${escapeAttribute(c.label)}">
          </button>
        `).join('')}
        <label class="siyuan-power-buttons__color-dot is-custom" title="${escapeAttribute(customColorLabel)}">
          <input type="color" class="siyuan-power-buttons__color-input" value="${currentColor || '#3b82f6'}">
          <span class="dot-custom-icon">🎨</span>
        </label>
      </div>
    </div>
    <div class="siyuan-power-buttons__popover-section">
      <div class="siyuan-power-buttons__popover-label">${escapeAttribute(changeIconLabel)}</div>
      <div class="siyuan-power-buttons__popover-icons">
        ${POPUP_QUICK_ICONS.map(icon => `
          <button type="button" class="siyuan-power-buttons__quick-icon-btn ${item.iconValue === icon.value ? 'is-active' : ''}"
                  data-icon-type="${icon.type}"
                  data-icon-value="${icon.value}"
                  title="${escapeAttribute(icon.label)}">
            ${createIconSvg(icon.value)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="siyuan-power-buttons__popover-footer">
      <button type="button" class="b3-button b3-button--text siyuan-power-buttons__popover-more-btn">
        ${escapeAttribute(moreSettingsLabel)}
      </button>
    </div>
  `;

  const applyColor = (newColor?: string) => {
    currentColor = newColor;
    if (newColor) {
      cardEl.classList.add('has-custom-color');
      const styles = getDockCardColorStyle(newColor);
      for (const [k, v] of Object.entries(styles)) {
        cardEl.style.setProperty(k, v);
      }
    } else {
      cardEl.classList.remove('has-custom-color');
      cardEl.style.removeProperty('--dock-card-custom-bg');
      cardEl.style.removeProperty('--dock-card-custom-hover-bg');
      cardEl.style.removeProperty('--dock-card-custom-border');
      cardEl.style.removeProperty('--dock-card-custom-active-bg');
      cardEl.style.removeProperty('--dock-card-custom-accent');
    }

    popover.querySelectorAll<HTMLElement>('.siyuan-power-buttons__color-dot').forEach(el => {
      const c = el.dataset.color;
      if (c === 'none') {
        el.classList.toggle('is-active', !newColor);
      } else if (c) {
        el.classList.toggle('is-active', Boolean(newColor && c.toLowerCase() === newColor.toLowerCase()));
      }
    });

    handlers.onUpdateItemAppearance?.(item.id, { color: newColor });
  };

  const applyIcon = (iconType: PowerButtonItem['iconType'], iconValue: string) => {
    const iconEl = cardEl.querySelector('.siyuan-power-buttons__dock-card-icon');
    if (iconEl) {
      iconEl.innerHTML = getIconMarkup({ ...item, iconType, iconValue });
    }

    popover.querySelectorAll<HTMLElement>('.siyuan-power-buttons__quick-icon-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.iconValue === iconValue);
    });

    handlers.onUpdateItemAppearance?.(item.id, { iconType, iconValue });
  };

  popover.querySelectorAll<HTMLElement>('.siyuan-power-buttons__color-dot').forEach(el => {
    const c = el.dataset.color;
    if (c === 'none') {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        applyColor(undefined);
      });
    } else if (c) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        applyColor(c);
      });
    }
  });

  const customColorInput = popover.querySelector<HTMLInputElement>('.siyuan-power-buttons__color-input');
  const onColorInput = (e: Event) => {
    e.stopPropagation();
    const val = customColorInput?.value;
    if (val) {
      applyColor(val);
    }
  };
  customColorInput?.addEventListener('input', onColorInput);
  customColorInput?.addEventListener('change', onColorInput);

  popover.querySelectorAll<HTMLElement>('.siyuan-power-buttons__quick-icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = (btn.dataset.iconType || 'iconpark') as PowerButtonItem['iconType'];
      const val = btn.dataset.iconValue || '';
      if (val) {
        applyIcon(type, val);
      }
    });
  });

  popover.querySelector('.siyuan-power-buttons__popover-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeActiveAppearancePopover();
  });

  popover.querySelector('.siyuan-power-buttons__popover-more-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeActiveAppearancePopover();
    onOpenSettings();
  });

  popover.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.body.appendChild(popover);
  activeAppearancePopover = popover;

  const rect = cardEl.getBoundingClientRect();
  const popoverWidth = 240;
  let top = rect.bottom + 6;
  let left = rect.left + (rect.width - popoverWidth) / 2;

  if (typeof window !== 'undefined') {
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }
    if (top + 280 > window.innerHeight - 12) {
      top = Math.max(12, rect.top - 280 - 6);
    }
  }

  popover.style.top = top + 'px';
  popover.style.left = left + 'px';

  const onDocumentClick = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node) && !cardEl.contains(e.target as Node)) {
      closeActiveAppearancePopover();
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeActiveAppearancePopover();
    }
  };

  setTimeout(() => {
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
  }, 0);

  activePopoverCleanup = () => {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onKeyDown);
  };
}

export function renderStandaloneDockPanel(
  host: HTMLElement,
  items: Array<PowerButtonItem | DockPanelEntry>,
  executor: CommandExecutor,
  onOpenSettings: () => void,
  i18n: {
    title?: string;
    settings?: string;
    empty?: string;
    goToSettings?: string;
    addDivider?: string;
    editDivider?: string;
    deleteDivider?: string;
    pluginEntryDividerTitle?: string;
    searchPluginsPlaceholder?: string;
    pinToDock?: string;
    unpinFromDock?: string;
    badgeSetting?: string;
    badgeTopBar?: string;
    badgeDock?: string;
    badgeCommand?: string;
    noPluginsFound?: string;
    togglePluginList?: string;
    foldPluginList?: string;
    expandPluginList?: string;
    resetLayout?: string;
    enablePlugin?: string;
    disablePlugin?: string;
    expandPluginGroup?: string;
    collapsePluginGroup?: string;
    pluginGroupCountSuffix?: string;
    appearanceSettings?: string;
    cardColor?: string;
    editAppearance?: string;
    defaultColor?: string;
    customColor?: string;
    moreSettings?: string;
    changeIcon?: string;
  } = {},
  handlers: {
    onAddDivider?: () => void | Promise<void>;
    onResetLayout?: () => void | Promise<void>;
    onEditDivider?: (id: string, currentTitle?: string) => void | Promise<void>;
    onRemoveDivider?: (id: string) => void | Promise<void>;
    onMoveItem?: (fromIndex: number, toIndex: number) => void | Promise<void>;
    onTogglePin?: (entry: DiscoveredPluginEntry) => void | Promise<void>;
    onToggleCollapse?: (collapsed: boolean) => void | Promise<void>;
    onSearchQueryChange?: (query: string) => void;
    onTogglePluginEnabled?: (pluginName: string, enabled: boolean) => Promise<boolean | void> | boolean | void;
    onToggleGroupExpanded?: (pluginName: string, expanded: boolean) => void | Promise<void>;
    onUpdateItemAppearance?: (itemId: string, patch: { color?: string; iconType?: PowerButtonItem['iconType']; iconValue?: string }) => void | Promise<void>;
  } = {},
  options: {
    pluginEntries?: DiscoveredPluginEntry[];
    pinnedActionIds?: Set<string>;
    isPluginListCollapsed?: boolean;
    initialSearchQuery?: string;
    initialExpandedPluginGroups?: string[];
    isPluginEnabled?: (pluginName: string) => boolean;
  } = {},
): void {
  const title = i18n.title || '随心按';
  const settingsLabel = i18n.settings || '设置';
  const emptyLabel = i18n.empty || '暂未放置快捷按钮';
  const goToSettingsLabel = i18n.goToSettings || '前往设置添加';
  const addDividerLabel = i18n.addDivider || '添加分割线';
  const resetLayoutLabel = i18n.resetLayout || '恢复默认布局';
  const editDividerLabel = i18n.editDivider || '修改分区名称';
  const deleteDividerLabel = i18n.deleteDivider || '删除分割线';

  const logoIcon = createIconSvg('iconpark:AsteriskKey');
  const addDividerIcon = createIconSvg('iconpark:Plus');
  const resetLayoutIcon = createIconSvg('iconpark:Refresh');
  const settingsIcon = createIconSvg('iconpark:SettingTwo');
  const editIcon = createIconSvg('iconpark:Edit');
  const deleteIcon = createIconSvg('iconpark:Delete');

  const prevContent = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-content');
  const prevContentScrollTop = prevContent ? prevContent.scrollTop : 0;
  const prevResults = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-results');
  const prevResultsScrollTop = prevResults ? prevResults.scrollTop : 0;

  disconnectDockResizeObserver();
  const prevInput = host.querySelector<HTMLInputElement>('.siyuan-power-buttons__dock-plugin-input');
  const wasInputFocused = prevInput ? document.activeElement === prevInput : false;
  const inputSelectionStart = prevInput?.selectionStart;
  const inputSelectionEnd = prevInput?.selectionEnd;

  host.innerHTML = '';
  host.classList.add('fn__flex-1', 'fn__flex-column', 'siyuan-power-buttons__standalone-dock');

  const header = document.createElement('div');
  header.className = 'block__icons';
  header.innerHTML = `
    <div class="block__logo">
      <span class="block__logoicon">${logoIcon}</span>
      <span>${escapeAttribute(title)}</span>
    </div>
    <span class="fn__flex-1"></span>
    <span class="block__icon block__icon--show b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-add-divider-btn" aria-label="${escapeAttribute(addDividerLabel)}">
      ${addDividerIcon}
    </span>
    <span class="block__icon block__icon--show b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-reset-btn" aria-label="${escapeAttribute(resetLayoutLabel)}">
      ${resetLayoutIcon}
    </span>
    <span class="block__icon block__icon--show b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-settings-btn" aria-label="${escapeAttribute(settingsLabel)}">
      ${settingsIcon}
    </span>
  `;

  header.querySelector('.siyuan-power-buttons__dock-add-divider-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onAddDivider?.();
  });

  header.querySelector('.siyuan-power-buttons__dock-reset-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onResetLayout?.();
  });

  header.querySelector('.siyuan-power-buttons__dock-settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    onOpenSettings();
  });
  host.appendChild(header);

  const content = document.createElement('div');
  content.className = 'siyuan-power-buttons__dock-content fn__flex-1';

  // Normalize entries
  const entries: DockPanelEntry[] = items.map((raw) => {
    if ('type' in raw && (raw.type === 'divider' || raw.type === 'button')) {
      return raw as DockPanelEntry;
    }
    return { type: 'button', item: raw as PowerButtonItem };
  });

  const hasButtons = entries.some(entry => entry.type === 'button');
  const hasPluginEntries = Boolean(options.pluginEntries && options.pluginEntries.length > 0);
  if (entries.length === 0 || (!hasButtons && !hasPluginEntries)) {
    const emptyContainer = document.createElement('div');
    emptyContainer.className = 'siyuan-power-buttons__dock-empty';
    emptyContainer.innerHTML = `
      <div class="siyuan-power-buttons__dock-empty-icon">${logoIcon}</div>
      <div class="siyuan-power-buttons__dock-empty-text">${escapeAttribute(emptyLabel)}</div>
      <button type="button" class="b3-button b3-button--outline siyuan-power-buttons__dock-empty-btn">${escapeAttribute(goToSettingsLabel)}</button>
    `;
    emptyContainer.querySelector('.siyuan-power-buttons__dock-empty-btn')?.addEventListener('click', () => {
      onOpenSettings();
    });
    content.appendChild(emptyContainer);
  } else {
    const grid = document.createElement('div');
    grid.className = 'siyuan-power-buttons__dock-grid';

    const pluginEntryDividerIndex = entries.findIndex(isPluginEntryDivider);
    let hasAppendedPluginSection = false;

    const maybeAppendPluginSection = () => {
      if (pluginEntryDividerIndex !== -1 && !hasAppendedPluginSection && options.pluginEntries) {
        hasAppendedPluginSection = true;
        const pluginSection = createPluginSearchSection(
          options.pluginEntries,
          options.pinnedActionIds || new Set(),
          Boolean(options.isPluginListCollapsed),
          options.initialSearchQuery || '',
          executor,
          i18n,
          handlers,
          { isPluginEnabled: options.isPluginEnabled, initialExpandedPluginGroups: options.initialExpandedPluginGroups },
        );
        grid.appendChild(pluginSection);
      }
    };

    entries.forEach((entry, index) => {
      if (entry.type === 'divider' && pluginEntryDividerIndex !== -1 && index > pluginEntryDividerIndex) {
        maybeAppendPluginSection();
      }

      if (entry.type === 'divider') {
        const divider = document.createElement('div');
        divider.className = `siyuan-power-buttons__dock-divider${entry.title ? '' : ' is-line-only'}`;
        divider.draggable = true;
        divider.dataset.dockIndex = String(index);
        divider.dataset.dividerId = entry.id;
        divider.innerHTML = `
          ${entry.title ? `<span class="siyuan-power-buttons__dock-divider-title">${escapeAttribute(entry.title)}</span>` : ''}
          <span class="siyuan-power-buttons__dock-divider-line"></span>
          <div class="siyuan-power-buttons__dock-divider-actions">
            <button type="button" class="siyuan-power-buttons__dock-divider-btn siyuan-power-buttons__dock-divider-edit b3-tooltips b3-tooltips__s" aria-label="${escapeAttribute(editDividerLabel)}">${editIcon}</button>
            <button type="button" class="siyuan-power-buttons__dock-divider-btn siyuan-power-buttons__dock-divider-del b3-tooltips b3-tooltips__s" aria-label="${escapeAttribute(deleteDividerLabel)}">${deleteIcon}</button>
          </div>
        `;

        divider.querySelector('.siyuan-power-buttons__dock-divider-edit')?.addEventListener('click', (e) => {
          e.stopPropagation();
          handlers.onEditDivider?.(entry.id, entry.title);
        });

        divider.querySelector('.siyuan-power-buttons__dock-divider-del')?.addEventListener('click', (e) => {
          e.stopPropagation();
          handlers.onRemoveDivider?.(entry.id);
        });

        divider.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', String(index));
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
          divider.classList.add('is-dragging');
        });
        divider.addEventListener('dragend', () => {
          divider.classList.remove('is-dragging');
        });
        divider.addEventListener('dragover', (e) => {
          e.preventDefault();
          divider.classList.add('is-drag-over');
        });
        divider.addEventListener('dragleave', () => {
          divider.classList.remove('is-drag-over');
        });
        divider.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          divider.classList.remove('is-drag-over');
          const fromIdxStr = e.dataTransfer?.getData('text/plain');
          if (!fromIdxStr) return;
          const fromIdx = parseInt(fromIdxStr, 10);
          if (!Number.isNaN(fromIdx) && fromIdx !== index) {
            handlers.onMoveItem?.(fromIdx, index);
          }
        });

        grid.appendChild(divider);
      } else {
        const item = entry.item;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'siyuan-power-buttons__dock-card';
        card.dataset.powerButtonsOwned = 'true';
        card.dataset.powerButtonsItemId = item.id;
        card.dataset.dockIndex = String(index);
        card.draggable = true;

        if (item.color) {
          card.classList.add('has-custom-color');
          const styles = getDockCardColorStyle(item.color);
          for (const [k, v] of Object.entries(styles)) {
            card.style.setProperty(k, v);
          }
        }

        const editAppearanceLabel = i18n.editAppearance || '修改外观';
        const editIcon = createIconSvg('iconpark:Edit');

        card.innerHTML = `
          <span class="siyuan-power-buttons__dock-card-edit b3-tooltips b3-tooltips__s" aria-label="${escapeAttribute(editAppearanceLabel)}">${editIcon}</span>
          <span class="siyuan-power-buttons__dock-card-icon">${getIconMarkup(item)}</span>
          <span class="siyuan-power-buttons__dock-card-title">${escapeAttribute(item.title)}</span>
        `;

        card.querySelector('.siyuan-power-buttons__dock-card-edit')?.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          showCardAppearancePopover(card, item, onOpenSettings, i18n, handlers);
        });

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          void executor.execute(item);
        });

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', String(index));
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
          card.classList.add('is-dragging');
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('is-dragging');
        });
        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          card.classList.add('is-drag-over');
        });
        card.addEventListener('dragleave', () => {
          card.classList.remove('is-drag-over');
        });
        card.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          card.classList.remove('is-drag-over');
          const fromIdxStr = e.dataTransfer?.getData('text/plain');
          if (!fromIdxStr) return;
          const fromIdx = parseInt(fromIdxStr, 10);
          if (!Number.isNaN(fromIdx) && fromIdx !== index) {
            handlers.onMoveItem?.(fromIdx, index);
          }
        });

        grid.appendChild(card);
      }
    });

    maybeAppendPluginSection();

    content.appendChild(grid);
  }

  host.appendChild(content);

  const newContent = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-content');
  const newResults = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-results');

  const restoreScrollAndFocus = () => {
    if (newContent && prevContentScrollTop > 0) {
      newContent.scrollTop = prevContentScrollTop;
    }
    if (newResults && prevResultsScrollTop > 0) {
      newResults.scrollTop = prevResultsScrollTop;
    }
    if (lastInteractedActionId && newResults) {
      const targetCard = Array.from(newResults.querySelectorAll<HTMLElement>('.siyuan-power-buttons__dock-plugin-card'))
        .find(c => c.dataset.actionId === lastInteractedActionId);
      if (targetCard && typeof targetCard.scrollIntoView === 'function') {
        targetCard.scrollIntoView({ block: 'nearest' });
      }
      lastInteractedActionId = null;
    }
  };

  restoreScrollAndFocus();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      restoreScrollAndFocus();
    });
  }

  if (wasInputFocused) {
    const newInput = host.querySelector<HTMLInputElement>('.siyuan-power-buttons__dock-plugin-input');
    if (newInput) {
      newInput.focus();
      if (typeof inputSelectionStart === 'number' && typeof inputSelectionEnd === 'number') {
        newInput.setSelectionRange(inputSelectionStart, inputSelectionEnd);
      }
    }
  }

  const adjustPluginResultsHeight = () => {
    if (!newContent || !newResults || newResults.classList.contains('fn__none')) return;
    const contentRect = newContent.getBoundingClientRect();
    const resultsRect = newResults.getBoundingClientRect();
    const available = contentRect.bottom - resultsRect.top - 12;
    if (contentRect.height > 0 && available > 0) {
      const targetMaxHeight = Math.max(160, Math.floor(available));
      newResults.style.maxHeight = `${targetMaxHeight}px`;
    }
  };

  adjustPluginResultsHeight();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      adjustPluginResultsHeight();
    });
  }

  if (typeof ResizeObserver !== 'undefined' && newContent) {
    activeDockResizeObserver = new ResizeObserver(() => {
      adjustPluginResultsHeight();
    });
    activeDockResizeObserver.observe(newContent);
  }
}

