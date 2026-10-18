import type { Dock } from 'siyuan';
import { DEFAULT_ICONPARK_ICON, DEFAULT_PLUGIN_COMMAND, PLUGIN_ENTRY_DIVIDER_ID } from '@/shared/constants';
import { hardenStrokeOnlySvgFill, renderIconMarkup } from '@/shared/icon-renderer';
import type { PowerButtonItem } from '@/shared/types';
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
    return hardenStrokeOnlySvgFill(icon, document);
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
  },
  sectionOptions: {
    isPluginEnabled?: (pluginName: string) => boolean;
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

    filtered.forEach(entry => {
      const isPinned = pinnedActionIds.has(entry.actionId);
      const isPluginEnabled = sectionOptions.isPluginEnabled
        ? sectionOptions.isPluginEnabled(entry.pluginName)
        : (entry.enabled ?? true);

      const hasToggleSwitch = entry.type === 'topbar' || entry.type === 'dock';

      const card = document.createElement('div');
      card.className = `siyuan-power-buttons__dock-plugin-card ${isPinned ? 'is-pinned' : ''} ${isPluginEnabled ? '' : 'is-disabled-plugin'}`;
      card.dataset.actionId = entry.actionId;
      card.dataset.pluginName = entry.pluginName;
      card.innerHTML = `
        <div class="siyuan-power-buttons__dock-plugin-icon">${getIconMarkup(entry as any)}</div>
        <div class="siyuan-power-buttons__dock-plugin-info">
          <div class="siyuan-power-buttons__dock-plugin-row-top">
            <span class="siyuan-power-buttons__dock-plugin-name">${escapeAttribute(entry.pluginDisplayName)}</span>
            <span class="siyuan-power-buttons__dock-plugin-badge is-${entry.type}">${escapeAttribute(badgeLabels[entry.type] || entry.type)}</span>
          </div>
          <div class="siyuan-power-buttons__dock-plugin-title">${escapeAttribute(entry.title)}</div>
        </div>
        <div class="siyuan-power-buttons__dock-plugin-actions">
          ${hasToggleSwitch ? `
            <label class="b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-plugin-toggle-wrapper"
                   aria-label="${escapeAttribute(isPluginEnabled ? disablePluginLabel : enablePluginLabel)}">
              <input type="checkbox"
                     class="b3-switch siyuan-power-buttons__dock-plugin-toggle-switch"
                     ${isPluginEnabled ? 'checked' : ''}
                     data-plugin-name="${escapeAttribute(entry.pluginName)}">
            </label>
          ` : ''}
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
        const toggleSwitch = card.querySelector<HTMLInputElement>('.siyuan-power-buttons__dock-plugin-toggle-switch');
        const toggleLabel = card.querySelector<HTMLLabelElement>('.siyuan-power-buttons__dock-plugin-toggle-wrapper');

        toggleLabel?.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        toggleSwitch?.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        toggleSwitch?.addEventListener('change', async (e) => {
          e.stopPropagation();
          lastInteractedActionId = entry.actionId;
          const targetEnabled = toggleSwitch.checked;
          toggleSwitch.disabled = true;
          try {
            const res = await handlers.onTogglePluginEnabled?.(entry.pluginName, targetEnabled);
            if (res === false) {
              toggleSwitch.checked = !targetEnabled;
            }
          } catch {
            toggleSwitch.checked = !targetEnabled;
          } finally {
            toggleSwitch.disabled = false;
            const currentChecked = toggleSwitch.checked;
            toggleLabel?.setAttribute('aria-label', currentChecked ? disablePluginLabel : enablePluginLabel);
            card.classList.toggle('is-disabled-plugin', !currentChecked);
          }
        });
      }

      resultsContainer.appendChild(card);
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
    handlers.onToggleCollapse?.(isCollapsed);
  });

  renderResults(currentQuery);

  container.appendChild(searchBar);
  container.appendChild(resultsContainer);
  return container;
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
    badgeCommand?: string;
    noPluginsFound?: string;
    togglePluginList?: string;
    foldPluginList?: string;
    expandPluginList?: string;
    resetLayout?: string;
    enablePlugin?: string;
    disablePlugin?: string;
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
  } = {},
  options: {
    pluginEntries?: DiscoveredPluginEntry[];
    pinnedActionIds?: Set<string>;
    isPluginListCollapsed?: boolean;
    initialSearchQuery?: string;
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
          { isPluginEnabled: options.isPluginEnabled },
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
        card.innerHTML = `
          <span class="siyuan-power-buttons__dock-card-icon">${getIconMarkup(item)}</span>
          <span class="siyuan-power-buttons__dock-card-title">${escapeAttribute(item.title)}</span>
        `;

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
}

