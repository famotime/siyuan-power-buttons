// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { SurfaceManager } from '@/core/surfaces/surface-manager';
import { CommandExecutor } from '@/core/commands';
import { createDefaultConfig } from '@/core/config/defaults';
import { PLUGIN_ENTRY_DIVIDER_ID } from '@/shared/constants';

describe('dock panel plugin entry and search', () => {
  it('renders plugin search section under the 插件入口 divider and supports search filtering', async () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const addDock = vi.fn().mockImplementation((options) => {
      dockInit = options.init;
      return { model: {} };
    });

    const plugin = {
      addTopBar: vi.fn().mockReturnValue(document.createElement('div')),
      addStatusBar: vi.fn().mockReturnValue(document.createElement('div')),
      addDock,
    } as never;

    const mockPlugins = [
      {
        name: 'siyuan-plugin-sample',
        displayName: '样例插件',
        openSetting: vi.fn(),
        topBarIcons: [],
        commands: [],
      },
      {
        name: 'siyuan-doc-assist',
        displayName: '文档助手',
        openSetting: vi.fn(),
        topBarIcons: [
          (() => {
            const el = document.createElement('div');
            el.setAttribute('data-id', 'doc-summary');
            el.setAttribute('aria-label', '快速摘要');
            el.innerHTML = '<svg><use xlink:href="#iconSummary"></use></svg>';
            return el;
          })(),
        ],
        commands: [
          {
            langKey: 'exportDoc',
            langText: '导出当前文档',
            callback: vi.fn(),
          },
        ],
      },
    ];

    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      t: (key) => key,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      getPlugins: () => mockPlugins,
    });

    const onSaveConfig = vi.fn();
    const setPluginListCollapsed = vi.fn();
    const uiStateStore = {
      snapshot: () => ({ isPluginListCollapsed: false }),
      setPluginListCollapsed,
    };

    const manager = new SurfaceManager(
      plugin,
      executor,
      onSaveConfig,
      () => mockPlugins,
      uiStateStore,
    );

    const config = createDefaultConfig();
    manager.render(config);

    const host = document.createElement('div');
    dockInit?.({ element: host });

    // 1. Verify plugin search section is rendered
    const pluginSection = host.querySelector('.siyuan-power-buttons__dock-plugin-section');
    expect(pluginSection).not.toBeNull();

    const input = host.querySelector<HTMLInputElement>('.siyuan-power-buttons__dock-plugin-input');
    expect(input).not.toBeNull();

    // Verify all plugin cards are rendered initially (3 entries from doc-assist + 1 from sample = 4)
    let cards = host.querySelectorAll('.siyuan-power-buttons__dock-plugin-card');
    expect(cards.length).toBe(4);

    // 2. Test search filter with Chinese text
    input!.value = '文档助手';
    input!.dispatchEvent(new Event('input'));
    cards = host.querySelectorAll('.siyuan-power-buttons__dock-plugin-card');
    expect(cards.length).toBe(3);

    // 3. Test search filter with Pinyin initials (wdzs -> 文档助手)
    input!.value = 'wdzs';
    input!.dispatchEvent(new Event('input'));
    cards = host.querySelectorAll('.siyuan-power-buttons__dock-plugin-card');
    expect(cards.length).toBe(3);

    // 4. Test search filter with non-matching query
    input!.value = 'notfoundkeyword123';
    input!.dispatchEvent(new Event('input'));
    cards = host.querySelectorAll('.siyuan-power-buttons__dock-plugin-card');
    expect(cards.length).toBe(0);
    expect(host.querySelector('.siyuan-power-buttons__dock-plugin-empty')?.textContent).toBe('未找到匹配的插件功能');

    // 5. Test clear button
    const clearBtn = host.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-clear-btn');
    expect(clearBtn).not.toBeNull();
    clearBtn?.click();
    expect(input!.value).toBe('');
    cards = host.querySelectorAll('.siyuan-power-buttons__dock-plugin-card');
    expect(cards.length).toBe(4);
  });

  it('supports pinning and unpinning plugin entries as dock-panel buttons', async () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const addDock = vi.fn().mockImplementation((options) => {
      dockInit = options.init;
      return { model: {} };
    });

    const plugin = {
      addTopBar: vi.fn().mockReturnValue(document.createElement('div')),
      addStatusBar: vi.fn().mockReturnValue(document.createElement('div')),
      addDock,
    } as never;

    const mockPlugins = [
      {
        name: 'siyuan-plugin-sample',
        displayName: '样例插件',
        openSetting: vi.fn(),
        topBarIcons: [],
        commands: [],
      },
    ];

    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      t: (key) => key,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      getPlugins: () => mockPlugins,
    });

    const onSaveConfig = vi.fn();
    const manager = new SurfaceManager(
      plugin,
      executor,
      onSaveConfig,
      () => mockPlugins,
    );

    const config = createDefaultConfig();
    manager.render(config);

    const host = document.createElement('div');
    dockInit?.({ element: host });

    // Initial check: sample plugin setting card should not be pinned
    const sampleCard = host.querySelector<HTMLElement>('[data-action-id="plugin-setting:siyuan-plugin-sample"]');
    expect(sampleCard).not.toBeNull();
    expect(sampleCard?.classList.contains('is-pinned')).toBe(false);

    // 1. Click pin button to pin the entry
    const pinBtn = sampleCard?.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-pin-btn');
    expect(pinBtn).not.toBeNull();
    pinBtn?.click();

    expect(onSaveConfig).toHaveBeenCalled();
    const savedConfig = onSaveConfig.mock.calls[0][0];

    // Verify button added to config.items and dock-panel layout
    const pinnedItem = savedConfig.items.find((item: any) => item.actionId === 'plugin-setting:siyuan-plugin-sample');
    expect(pinnedItem).toBeDefined();
    expect(pinnedItem.title).toBe('样例插件 设置');
    expect(pinnedItem.surface).toBe('dock-panel');

    const dockLayout = savedConfig.surfaceLayouts['dock-panel'];
    const dividerIdx = dockLayout.findIndex((e: any) => e.type === 'divider' && e.id === PLUGIN_ENTRY_DIVIDER_ID);
    const itemLayoutIdx = dockLayout.findIndex((e: any) => e.type === 'button' && e.id === pinnedItem.id);
    expect(dividerIdx).toBeGreaterThanOrEqual(0);
    expect(itemLayoutIdx).toBeGreaterThan(dividerIdx);

    // 2. Click pin button again to unpin
    const updatedSampleCard = host.querySelector<HTMLElement>('[data-action-id="plugin-setting:siyuan-plugin-sample"]');
    expect(updatedSampleCard?.classList.contains('is-pinned')).toBe(true);

    const unpinBtn = updatedSampleCard?.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-pin-btn');
    unpinBtn?.click();

    expect(onSaveConfig).toHaveBeenCalledTimes(2);
    const unpinnedConfig = onSaveConfig.mock.calls[1][0];
    const stillPinned = unpinnedConfig.items.some((item: any) => item.actionId === 'plugin-setting:siyuan-plugin-sample');
    expect(stillPinned).toBe(false);
  });

  it('supports toggling collapse on plugin list and remembers state', async () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const addDock = vi.fn().mockImplementation((options) => {
      dockInit = options.init;
      return { model: {} };
    });

    const plugin = {
      addTopBar: vi.fn().mockReturnValue(document.createElement('div')),
      addStatusBar: vi.fn().mockReturnValue(document.createElement('div')),
      addDock,
    } as never;

    const mockPlugins = [
      {
        name: 'sample',
        displayName: 'Sample',
        openSetting: vi.fn(),
      },
    ];

    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      t: (key) => key,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      getPlugins: () => mockPlugins,
    });

    const setPluginListCollapsed = vi.fn();
    const uiStateStore = {
      snapshot: () => ({ isPluginListCollapsed: false }),
      setPluginListCollapsed,
    };

    const manager = new SurfaceManager(
      plugin,
      executor,
      vi.fn(),
      () => mockPlugins,
      uiStateStore,
    );

    const config = createDefaultConfig();
    manager.render(config);

    const host = document.createElement('div');
    dockInit?.({ element: host });

    const collapseBtn = host.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-collapse-btn');
    const results = host.querySelector('.siyuan-power-buttons__dock-plugin-results');
    expect(collapseBtn).not.toBeNull();
    expect(results?.classList.contains('fn__none')).toBe(false);
    // Verify tooltip class uses South-West direction to avoid right-edge clipping
    expect(collapseBtn?.classList.contains('b3-tooltips__sw')).toBe(true);
    expect(collapseBtn?.classList.contains('b3-tooltips__s')).toBe(false);
    expect(collapseBtn?.getAttribute('aria-label')).toBe('折叠插件列表');
    // Initially expanded -> Chevron Down icon
    expect(collapseBtn?.innerHTML).toContain('m6 9 6 6 6-6');

    // Toggle collapse
    collapseBtn?.click();
    expect(results?.classList.contains('fn__none')).toBe(true);
    expect(collapseBtn?.classList.contains('is-collapsed')).toBe(true);
    // Collapsed -> Chevron Right icon and updated tooltip label
    expect(collapseBtn?.innerHTML).toContain('m9 18 6-6-6-6');
    expect(collapseBtn?.getAttribute('aria-label')).toBe('展开插件列表');
    expect(setPluginListCollapsed).toHaveBeenCalledWith(true);

    // Toggle back
    collapseBtn?.click();
    expect(results?.classList.contains('fn__none')).toBe(false);
    expect(collapseBtn?.classList.contains('is-collapsed')).toBe(false);
    // Expanded back -> Chevron Down icon and restored tooltip label
    expect(collapseBtn?.innerHTML).toContain('m6 9 6 6 6-6');
    expect(collapseBtn?.getAttribute('aria-label')).toBe('折叠插件列表');
    expect(setPluginListCollapsed).toHaveBeenCalledWith(false);
  });

  it('supports resetting dock-panel layout to default via top header button', async () => {
    let dockInit: ((dock: { element: HTMLElement }) => void) | undefined;
    const addDock = vi.fn().mockImplementation((options) => {
      dockInit = options.init;
      return { model: {} };
    });

    const plugin = {
      addTopBar: vi.fn().mockReturnValue(document.createElement('div')),
      addStatusBar: vi.fn().mockReturnValue(document.createElement('div')),
      addDock,
    } as never;

    const mockPlugins = [
      {
        name: 'sample',
        displayName: 'Sample',
        openSetting: vi.fn(),
      },
    ];

    const executor = new CommandExecutor({
      plugin: { globalCommand: vi.fn() } as never,
      notify: vi.fn(),
      t: (key) => key,
      openUrl: vi.fn(),
      pluginCommands: new Map(),
      getPlugins: () => mockPlugins,
    });

    const onSaveConfig = vi.fn();
    const manager = new SurfaceManager(
      plugin,
      executor,
      onSaveConfig,
      () => mockPlugins,
    );

    const config = createDefaultConfig();
    // 故意修改 dock-panel 布局：增加自定义分割线，删除大部分默认项
    config.surfaceLayouts['dock-panel'] = [
      { type: 'divider', id: 'custom-div', title: '自定义分类' },
      { type: 'button', id: 'pb-378f4f34-6cca-47a2-99d9-a240a248e31a' },
    ];
    manager.render(config);

    const host = document.createElement('div');
    dockInit?.({ element: host });

    const resetBtn = host.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-reset-btn');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn?.classList.contains('b3-tooltips__sw')).toBe(true);
    expect(resetBtn?.getAttribute('aria-label')).toBe('恢复默认布局');

    // 1. 测试取消重置
    resetBtn?.click();
    const cancelBtn = document.querySelector<HTMLButtonElement>('.b3-dialog__action .b3-button--cancel');
    expect(cancelBtn).not.toBeNull();
    cancelBtn?.click();
    expect(onSaveConfig).not.toHaveBeenCalled();

    // 2. 测试确认重置
    resetBtn?.click();
    const confirmBtn = document.querySelector<HTMLButtonElement>('.b3-dialog__action .b3-button--text');
    expect(confirmBtn).not.toBeNull();
    confirmBtn?.click();

    // 等待异步完成
    await Promise.resolve();
    await Promise.resolve();

    expect(onSaveConfig).toHaveBeenCalled();
    const savedConfig = onSaveConfig.mock.calls[0][0];
    const defaultDockLayout = createDefaultConfig().surfaceLayouts['dock-panel'];
    expect(savedConfig.surfaceLayouts['dock-panel']).toEqual(defaultDockLayout);
  });
});
