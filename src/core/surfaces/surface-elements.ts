import type { Dock, Plugin } from 'siyuan';
import { DEFAULT_ICONPARK_ICON, DEFAULT_PLUGIN_COMMAND } from '@/shared/constants';
import { hardenStrokeOnlySvgFill, renderIconMarkup } from '@/shared/icon-renderer';
import type { PowerButtonItem } from '@/shared/types';
import { CommandExecutor } from '@/core/commands';
import type { CanvasMountTarget } from '@/core/surfaces/canvas-mount-target';

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
  } = {},
  handlers: {
    onAddDivider?: () => void | Promise<void>;
    onEditDivider?: (id: string, currentTitle?: string) => void | Promise<void>;
    onRemoveDivider?: (id: string) => void | Promise<void>;
    onMoveItem?: (fromIndex: number, toIndex: number) => void | Promise<void>;
  } = {},
): void {
  const title = i18n.title || '随心按';
  const settingsLabel = i18n.settings || '设置';
  const emptyLabel = i18n.empty || '暂未放置快捷按钮';
  const goToSettingsLabel = i18n.goToSettings || '前往设置添加';
  const addDividerLabel = i18n.addDivider || '添加分割线';
  const editDividerLabel = i18n.editDivider || '修改分区名称';
  const deleteDividerLabel = i18n.deleteDivider || '删除分割线';

  const logoIcon = createIconSvg('iconpark:AsteriskKey');
  const addDividerIcon = createIconSvg('iconpark:Plus');
  const settingsIcon = createIconSvg('iconpark:SettingTwo');
  const editIcon = createIconSvg('iconpark:Edit');
  const deleteIcon = createIconSvg('iconpark:Delete');

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
    <span class="block__icon block__icon--show b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-settings-btn" aria-label="${escapeAttribute(settingsLabel)}">
      ${settingsIcon}
    </span>
  `;

  header.querySelector('.siyuan-power-buttons__dock-add-divider-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onAddDivider?.();
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

  if (entries.length === 0) {
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

    entries.forEach((entry, index) => {
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
        card.className = 'siyuan-power-buttons__dock-card b3-tooltips b3-tooltips__s';
        card.title = item.tooltip || item.title;
        card.setAttribute('aria-label', item.tooltip || item.title);
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

    content.appendChild(grid);
  }

  host.appendChild(content);
}

