// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderStandaloneDockPanel, closeActiveAppearancePopover } from '@/core/surfaces/surface-elements';
import type { PowerButtonItem } from '@/shared/types';
import { CommandExecutor } from '@/core/commands';

describe('dock panel appearance and popover', () => {
  let host: HTMLElement;
  const mockExecutor = {
    execute: vi.fn(),
  } as unknown as CommandExecutor;

  beforeEach(() => {
    closeActiveAppearancePopover();
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  const createItem = (overrides: Partial<PowerButtonItem> = {}): PowerButtonItem => ({
    id: 'test-btn',
    title: '测试按钮',
    visible: true,
    iconType: 'iconpark',
    iconValue: 'iconpark:Star',
    surface: 'dock-panel',
    surfaces: ['dock-panel'],
    order: 0,
    actionType: 'builtin-global-command',
    actionId: 'recentDocs',
    ...overrides,
  });

  it('renders dock card with custom color styles when color is configured', () => {
    const item = createItem({ color: '#f43f5e' });
    renderStandaloneDockPanel(host, [item], mockExecutor, vi.fn());

    const card = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card');
    expect(card).toBeTruthy();
    expect(card?.classList.contains('has-custom-color')).toBe(true);
    expect(card?.style.getPropertyValue('--dock-card-custom-accent')).toBe('#f43f5e');
    expect(card?.style.getPropertyValue('--dock-card-custom-bg')).toContain('rgba(244, 63, 94');
  });

  it('renders edit appearance button on dock card', () => {
    const item = createItem();
    renderStandaloneDockPanel(host, [item], mockExecutor, vi.fn(), {
      editAppearance: '修改外观',
    });

    const editBtn = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card-edit');
    expect(editBtn).toBeTruthy();
    expect(editBtn?.getAttribute('aria-label')).toBe('修改外观');
  });

  it('opens appearance popover when edit button is clicked', () => {
    const item = createItem({ color: '#3b82f6' });
    const onOpenSettings = vi.fn();
    const onUpdateAppearance = vi.fn();

    renderStandaloneDockPanel(
      host,
      [item],
      mockExecutor,
      onOpenSettings,
      {
        editAppearance: '修改外观',
        cardColor: '侧栏卡片颜色',
        changeIcon: '更换图标',
      },
      {
        onUpdateItemAppearance: onUpdateAppearance,
      },
    );

    const editBtn = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card-edit');
    editBtn?.click();

    const popover = document.querySelector<HTMLElement>('.siyuan-power-buttons__appearance-popover');
    expect(popover).toBeTruthy();
    expect(popover?.textContent).toContain('修改外观');
    expect(popover?.textContent).toContain('侧栏卡片颜色');
    expect(popover?.textContent).toContain('更换图标');

    // 检查是否有预设颜色圆点
    const colorDots = popover?.querySelectorAll<HTMLElement>('.siyuan-power-buttons__color-dot');
    expect(colorDots && colorDots.length).toBeGreaterThan(5);

    // 检查是否有常用快捷图标
    const iconButtons = popover?.querySelectorAll<HTMLElement>('.siyuan-power-buttons__quick-icon-btn');
    expect(iconButtons && iconButtons.length).toBeGreaterThan(5);
  });

  it('updates card style and calls handler when color dot is clicked', () => {
    const item = createItem();
    const onUpdateAppearance = vi.fn();

    renderStandaloneDockPanel(
      host,
      [item],
      mockExecutor,
      vi.fn(),
      {},
      {
        onUpdateItemAppearance: onUpdateAppearance,
      },
    );

    const card = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card')!;
    const editBtn = card.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card-edit')!;
    editBtn.click();

    const popover = document.querySelector<HTMLElement>('.siyuan-power-buttons__appearance-popover')!;
    const roseDot = popover.querySelector<HTMLElement>('[data-color="#f43f5e"]')!;
    expect(roseDot).toBeTruthy();

    roseDot.click();

    expect(card.classList.contains('has-custom-color')).toBe(true);
    expect(card.style.getPropertyValue('--dock-card-custom-accent')).toBe('#f43f5e');
    expect(onUpdateAppearance).toHaveBeenCalledWith('test-btn', { color: '#f43f5e' });
  });

  it('clears color when default/none color dot is clicked', () => {
    const item = createItem({ color: '#f43f5e' });
    const onUpdateAppearance = vi.fn();

    renderStandaloneDockPanel(
      host,
      [item],
      mockExecutor,
      vi.fn(),
      {},
      {
        onUpdateItemAppearance: onUpdateAppearance,
      },
    );

    const card = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card')!;
    const editBtn = card.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card-edit')!;
    editBtn.click();

    const popover = document.querySelector<HTMLElement>('.siyuan-power-buttons__appearance-popover')!;
    const noneDot = popover.querySelector<HTMLElement>('[data-color="none"]')!;
    expect(noneDot).toBeTruthy();

    noneDot.click();

    expect(card.classList.contains('has-custom-color')).toBe(false);
    expect(onUpdateAppearance).toHaveBeenCalledWith('test-btn', { color: undefined });
  });

  it('updates icon and calls handler when quick icon button is clicked', () => {
    const item = createItem({ iconValue: 'iconpark:Star' });
    const onUpdateAppearance = vi.fn();

    renderStandaloneDockPanel(
      host,
      [item],
      mockExecutor,
      vi.fn(),
      {},
      {
        onUpdateItemAppearance: onUpdateAppearance,
      },
    );

    const card = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card')!;
    const editBtn = card.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card-edit')!;
    editBtn.click();

    const popover = document.querySelector<HTMLElement>('.siyuan-power-buttons__appearance-popover')!;
    const heartBtn = popover.querySelector<HTMLElement>('[data-icon-value="iconpark:Heart"]')!;
    expect(heartBtn).toBeTruthy();

    heartBtn.click();

    expect(onUpdateAppearance).toHaveBeenCalledWith('test-btn', {
      iconType: 'iconpark',
      iconValue: 'iconpark:Heart',
    });
  });

  it('opens main settings when more settings button is clicked', () => {
    const item = createItem();
    const onOpenSettings = vi.fn();

    renderStandaloneDockPanel(host, [item], mockExecutor, onOpenSettings);

    const editBtn = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-card-edit')!;
    editBtn.click();

    const popover = document.querySelector<HTMLElement>('.siyuan-power-buttons__appearance-popover')!;
    const moreBtn = popover.querySelector<HTMLElement>('.siyuan-power-buttons__popover-more-btn')!;
    moreBtn.click();

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.siyuan-power-buttons__appearance-popover')).toBeNull();
  });
});
