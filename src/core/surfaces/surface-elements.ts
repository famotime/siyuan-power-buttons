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

export function renderStandaloneDockPanel(
  host: HTMLElement,
  items: PowerButtonItem[],
  executor: CommandExecutor,
  onOpenSettings: () => void,
  i18n: {
    title?: string;
    settings?: string;
    empty?: string;
    goToSettings?: string;
  } = {},
): void {
  const title = i18n.title || '随心按';
  const settingsLabel = i18n.settings || '设置';
  const emptyLabel = i18n.empty || '暂未放置快捷按钮';
  const goToSettingsLabel = i18n.goToSettings || '前往设置添加';
  const logoIcon = createIconSvg('iconpark:AsteriskKey');
  const settingsIcon = createIconSvg('iconpark:SettingTwo');

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
    <span class="block__icon b3-tooltips b3-tooltips__sw siyuan-power-buttons__dock-settings-btn" aria-label="${escapeAttribute(settingsLabel)}">
      ${settingsIcon}
    </span>
  `;
  header.querySelector('.siyuan-power-buttons__dock-settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    onOpenSettings();
  });
  host.appendChild(header);

  const content = document.createElement('div');
  content.className = 'siyuan-power-buttons__dock-content fn__flex-1';

  if (items.length === 0) {
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

    for (const item of items) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'siyuan-power-buttons__dock-card b3-tooltips b3-tooltips__s';
      card.title = item.tooltip || item.title;
      card.setAttribute('aria-label', item.tooltip || item.title);
      card.dataset.powerButtonsOwned = 'true';
      card.dataset.powerButtonsItemId = item.id;
      card.innerHTML = `
        <span class="siyuan-power-buttons__dock-card-icon">${getIconMarkup(item)}</span>
        <span class="siyuan-power-buttons__dock-card-title">${escapeAttribute(item.title)}</span>
      `;
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        void executor.execute(item);
      });
      grid.appendChild(card);
    }
    content.appendChild(grid);
  }

  host.appendChild(content);
}

