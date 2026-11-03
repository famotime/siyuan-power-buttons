// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { SurfaceManager } from '@/core/surfaces/surface-manager';
import { CommandExecutor } from '@/core/commands';
import { createDefaultConfig } from '@/core/config/defaults';
import { PluginStateManager } from '@/core/plugins/plugin-state-manager';
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

    const groupHeaders = () => host.querySelectorAll<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-header');
    const childCards = () => host.querySelectorAll<HTMLElement>(
      '.siyuan-power-buttons__dock-plugin-group-children .siyuan-power-buttons__dock-plugin-card',
    );
    const getGroup = (pluginName: string) =>
      host.querySelector<HTMLElement>(`.siyuan-power-buttons__dock-plugin-group[data-plugin-name="${pluginName}"]`);

    // Entries are grouped under plugin cards: 2 group headers + 4 child cards (3 doc-assist + 1 sample)
    expect(groupHeaders().length).toBe(2);
    expect(childCards().length).toBe(4);

    const docGroup = getGroup('siyuan-doc-assist');
    expect(docGroup).not.toBeNull();
    // Plugin with commands shows a command count badge and starts collapsed
    expect(docGroup!.querySelector('.siyuan-power-buttons__dock-plugin-group-count')?.textContent).toBe('1');
    expect(docGroup!.querySelector('.siyuan-power-buttons__dock-plugin-group-children')?.classList.contains('fn__none')).toBe(true);

    const sampleGroup = getGroup('siyuan-plugin-sample');
    expect(sampleGroup).not.toBeNull();
    // Plugin without commands is not collapsible: no count badge, no chevron, children always visible
    expect(sampleGroup!.querySelector('.siyuan-power-buttons__dock-plugin-group-count')).toBeNull();
    expect(sampleGroup!.querySelector('.siyuan-power-buttons__dock-plugin-group-chevron')).toBeNull();
    expect(sampleGroup!.querySelector('.siyuan-power-buttons__dock-plugin-group-children')?.classList.contains('fn__none')).toBe(false);

    // Command child card shows the command title instead of repeating the plugin name
    const commandCard = docGroup!.querySelector<HTMLElement>('[data-action-id="plugin-cmd:siyuan-doc-assist__exportDoc"]');
    expect(commandCard?.textContent).toContain('导出当前文档');
    expect(commandCard?.querySelector('.siyuan-power-buttons__dock-plugin-badge.is-command')).not.toBeNull();

    // 2. Test search filter with Chinese text (plugin name match keeps the whole group)
    input!.value = '文档助手';
    input!.dispatchEvent(new Event('input'));
    expect(groupHeaders().length).toBe(1);
    expect(childCards().length).toBe(3);
    // Matched groups are force-expanded during search
    expect(getGroup('siyuan-doc-assist')!.querySelector('.siyuan-power-buttons__dock-plugin-group-children')?.classList.contains('fn__none')).toBe(false);

    // 3. Test search filter with Pinyin initials (wdzs -> 文档助手)
    input!.value = 'wdzs';
    input!.dispatchEvent(new Event('input'));
    expect(groupHeaders().length).toBe(1);
    expect(childCards().length).toBe(3);

    // 4. Test search filter with non-matching query
    input!.value = 'notfoundkeyword123';
    input!.dispatchEvent(new Event('input'));
    expect(groupHeaders().length).toBe(0);
    expect(childCards().length).toBe(0);
    expect(host.querySelector('.siyuan-power-buttons__dock-plugin-empty')?.textContent).toBe('未找到匹配的插件功能');

    // 5. Test clear button restores grouping and the collapse memory
    const clearBtn = host.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-clear-btn');
    expect(clearBtn).not.toBeNull();
    clearBtn?.click();
    expect(input!.value).toBe('');
    expect(groupHeaders().length).toBe(2);
    expect(childCards().length).toBe(4);
    expect(getGroup('siyuan-doc-assist')!.querySelector('.siyuan-power-buttons__dock-plugin-group-children')?.classList.contains('fn__none')).toBe(true);
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

  it('renders quick toggle switch for plugins and supports toggling enabled state', async () => {
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
        name: 'active-plugin',
        displayName: '激活插件',
        openSetting: vi.fn(),
        topBarIcons: [
          (() => {
            const el = document.createElement('div');
            el.setAttribute('data-id', 'tb-active');
            el.setAttribute('aria-label', '激活插件 顶栏按钮');
            return el;
          })(),
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

    const fetchPost = vi.fn().mockResolvedValue({ code: 0 });
    const pluginStateManager = new PluginStateManager({
      fetchPost,
      getActivePlugins: () => mockPlugins,
      t: (key) => {
        const dict: Record<string, string> = {
          enablePlugin: '启用插件',
          disablePlugin: '停用插件',
        };
        return dict[key] || key;
      },
    });

    pluginStateManager.setInstalledPackages([
      { name: 'active-plugin', displayName: '激活插件', enabled: true },
      { name: 'disabled-plugin', displayName: '停用插件', enabled: false },
    ]);

    const manager = new SurfaceManager(
      plugin,
      executor,
      vi.fn(),
      () => mockPlugins,
      undefined,
      pluginStateManager,
    );

    const config = createDefaultConfig();
    manager.render(config);

    const host = document.createElement('div');
    dockInit?.({ element: host });

    // 1. Group structure: active-plugin renders as a group header + 2 children; disabled-plugin stays a flat placeholder card
    const activeGroup = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group[data-plugin-name="active-plugin"]');
    expect(activeGroup).not.toBeNull();
    const activeGroupHeader = activeGroup!.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-header');
    expect(activeGroupHeader).not.toBeNull();

    const settingCard = activeGroup!.querySelector<HTMLElement>('[data-action-id="plugin-setting:active-plugin"]');
    const activeTopbarCard = activeGroup!.querySelector<HTMLElement>('[data-action-id="plugin-topbar:active-plugin__tb-active"]');
    const disabledCard = host.querySelector<HTMLElement>('[data-action-id="plugin-topbar:disabled-plugin__main"]');

    expect(settingCard).toBeDefined();
    expect(activeTopbarCard).toBeDefined();
    expect(disabledCard).toBeDefined();

    // 2. Setting card must NOT have a toggle switch, only pin button
    expect(settingCard?.querySelector('.siyuan-power-buttons__dock-plugin-toggle-switch')).toBeNull();
    expect(settingCard?.querySelector('.siyuan-power-buttons__dock-plugin-pin-btn')).not.toBeNull();

    // 3. Toggle switches are promoted to the plugin group header; child cards no longer carry them
    const activeWrapper = activeGroupHeader!.querySelector<HTMLLabelElement>('.siyuan-power-buttons__dock-plugin-toggle-wrapper');
    const disabledWrapper = disabledCard!.querySelector<HTMLLabelElement>('.siyuan-power-buttons__dock-plugin-toggle-wrapper');
    const activeSwitch = activeGroupHeader!.querySelector<HTMLInputElement>('input.siyuan-power-buttons__dock-plugin-toggle-switch');
    const disabledSwitch = disabledCard!.querySelector<HTMLInputElement>('input.siyuan-power-buttons__dock-plugin-toggle-switch');

    expect(activeTopbarCard?.querySelector('.siyuan-power-buttons__dock-plugin-toggle-switch')).toBeNull();

    expect(activeWrapper).not.toBeNull();
    expect(disabledWrapper).not.toBeNull();
    expect(activeWrapper?.classList.contains('b3-tooltips')).toBe(true);
    expect(activeWrapper?.getAttribute('aria-label')).toBe('停用插件');
    expect(disabledWrapper?.getAttribute('aria-label')).toBe('启用插件');

    // Switch input itself must NOT have b3-tooltips to prevent pseudo-element conflicts
    expect(activeSwitch?.classList.contains('b3-tooltips')).toBe(false);
    expect(disabledSwitch?.classList.contains('b3-tooltips')).toBe(false);

    expect(activeSwitch?.checked).toBe(true);
    expect(disabledSwitch?.checked).toBe(false);
    expect(disabledCard?.classList.contains('is-disabled-plugin')).toBe(true);
    expect(activeGroup?.classList.contains('is-disabled-plugin')).toBe(false);

    // 4. Toggle switch state on disabled plugin
    disabledSwitch!.checked = true;
    disabledSwitch?.dispatchEvent(new Event('change'));

    expect(fetchPost).toHaveBeenCalledWith('/api/petal/setPetalEnabled', {
      packageName: 'disabled-plugin',
      enabled: true,
    });

    // Wait for async update
    await Promise.resolve();
    await Promise.resolve();

    expect(pluginStateManager.isPluginEnabled('disabled-plugin')).toBe(true);
  });

  it('preserves scroll position and target card visibility when toggling switch or re-rendering', async () => {
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
        name: 'sample-plugin',
        displayName: '测试插件',
        openSetting: vi.fn(),
        topBarIcons: [
          (() => {
            const el = document.createElement('div');
            el.setAttribute('data-id', 'tb-test');
            el.setAttribute('aria-label', '测试顶栏按钮');
            return el;
          })(),
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

    const fetchPost = vi.fn().mockResolvedValue({ code: 0 });
    const pluginStateManager = new PluginStateManager({
      fetchPost,
      getActivePlugins: () => mockPlugins,
    });

    const manager = new SurfaceManager(
      plugin,
      executor,
      vi.fn(),
      () => mockPlugins,
      undefined,
      pluginStateManager,
    );

    const config = createDefaultConfig();
    manager.render(config);

    const host = document.createElement('div');
    dockInit?.({ element: host });

    // Simulate user scrolled down in the results container and content container
    const content = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-content');
    const results = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-results');
    expect(content).not.toBeNull();
    expect(results).not.toBeNull();

    content!.scrollTop = 150;
    results!.scrollTop = 80;

    // Target card scrollIntoView spy on Element.prototype
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    const toggleSwitch = host.querySelector<HTMLInputElement>('input.siyuan-power-buttons__dock-plugin-toggle-switch');
    expect(toggleSwitch).not.toBeNull();

    // Trigger toggle switch change
    toggleSwitch!.checked = false;
    toggleSwitch?.dispatchEvent(new Event('change'));

    // Wait for toggle action and notify
    await Promise.resolve();
    await Promise.resolve();

    // After re-rendering, verify scroll position was preserved
    const newContent = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-content');
    const newResults = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-results');

    expect(newContent?.scrollTop).toBe(150);
    expect(newResults?.scrollTop).toBe(80);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest' });

    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('renders dock-only plugin with dock badge and toggle switch, and toggles plugin state on switch change', async () => {
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

    // 只有侧栏图标、没有顶栏图标的插件
    const mockPlugins = [
      {
        name: 'siyuan-plugin-graph',
        displayName: '关系图谱插件',
        openSetting: vi.fn(),
        topBarIcons: [],
        docks: {
          'siyuan-plugin-graph_dock': {
            id: 'graph_dock',
            config: {
              title: '全局关系图',
              icon: '#iconGraph',
            },
          },
        },
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

    const fetchPost = vi.fn().mockResolvedValue({ code: 0 });
    const pluginStateManager = new PluginStateManager({
      fetchPost,
      getActivePlugins: () => mockPlugins,
    });

    const manager = new SurfaceManager(
      plugin,
      executor,
      vi.fn(),
      () => mockPlugins,
      undefined,
      pluginStateManager,
    );

    const config = createDefaultConfig();
    manager.render(config);

    const host = document.createElement('div');
    dockInit?.({ element: host });

    // 搜索结果卡片检查：1 个插件组卡头 + 2 个子卡（设置 + 侧栏）
    const groupHeaders = host.querySelectorAll('.siyuan-power-buttons__dock-plugin-group-header');
    expect(groupHeaders.length).toBe(1);
    const childCards = host.querySelectorAll('.siyuan-power-buttons__dock-plugin-group-children .siyuan-power-buttons__dock-plugin-card');
    expect(childCards.length).toBe(2);

    const dockCard = Array.from(childCards).find(
      (c) => (c as HTMLElement).dataset.actionId === 'plugin-dock:siyuan-plugin-graph__siyuan-plugin-graph_dock',
    );
    expect(dockCard).toBeDefined();

    // 检查侧栏徽章
    const badge = dockCard!.querySelector('.siyuan-power-buttons__dock-plugin-badge.is-dock');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('侧栏');

    // 启停开关提升到插件组卡头上
    const groupHeader = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-header');
    expect(groupHeader).not.toBeNull();
    const toggleSwitch = groupHeader!.querySelector<HTMLInputElement>('input.siyuan-power-buttons__dock-plugin-toggle-switch');
    expect(toggleSwitch).not.toBeNull();
    expect(toggleSwitch?.checked).toBe(true);

    // 切换开关
    toggleSwitch!.checked = false;
    toggleSwitch?.dispatchEvent(new Event('change'));

    expect(fetchPost).toHaveBeenCalledWith('/api/petal/setPetalEnabled', {
      packageName: 'siyuan-plugin-graph',
      enabled: false,
    });
  });
  it('dynamically adapts plugin results max-height to fill available bottom space', async () => {
    let resizeCallback: (() => void) | undefined;
    class MockResizeObserver {
      constructor(callback: () => void) {
        resizeCallback = callback;
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

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

    const executor = new CommandExecutor({
      plugin,
      notify: vi.fn(),
      t: (key: string) => key,
      pluginCommands: new Map(),
      openUrl: vi.fn(),
      runBuiltinCommand: vi.fn(),
    });

    const pluginStateManager = new PluginStateManager({
      fetchPost: vi.fn().mockResolvedValue({ code: 0 }),
      getFrontend: () => 'desktop',
      getActivePlugins: () => [],
      notify: vi.fn(),
      t: (key: string) => key,
    });

    const config = createDefaultConfig();
    const manager = new SurfaceManager(
      plugin,
      executor,
      undefined,
      () => [
        {
          name: 'plugin-a',
          displayName: '插件A',
          topBarIcons: [{ id: 'tb1', title: '功能1' }],
        },
      ],
      undefined,
      pluginStateManager,
    );

    manager.render(config);

    const dockElement = document.createElement('div');
    document.body.appendChild(dockElement);
    dockInit?.({ element: dockElement });

    const content = dockElement.querySelector<HTMLElement>('.siyuan-power-buttons__dock-content');
    const results = dockElement.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-results');

    expect(content).not.toBeNull();
    expect(results).not.toBeNull();

    vi.spyOn(content!, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 800,
      height: 800,
      left: 0,
      right: 320,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    vi.spyOn(results!, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      bottom: 480,
      height: 280,
      left: 0,
      right: 320,
      width: 320,
      x: 0,
      y: 200,
      toJSON: () => {},
    });

    resizeCallback?.();

    expect(results?.style.maxHeight).toBe('588px');

    manager.destroy();
    vi.unstubAllGlobals();
  });

  it('groups plugin entries under plugin cards and persists per-plugin expand/collapse state', async () => {
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
        displayName: '样例插件',
        openSetting: vi.fn(),
        commands: [
          { langKey: 'cmdOne', langText: '命令一', callback: vi.fn() },
          { langKey: 'cmdTwo', langText: '命令二', callback: vi.fn() },
        ],
      },
      {
        name: 'plain',
        displayName: '朴素插件',
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

    const setExpandedPluginGroups = vi.fn();
    const uiStateStore = {
      snapshot: () => ({ isPluginListCollapsed: false, expandedPluginGroups: [] }),
      setPluginListCollapsed: vi.fn(),
      setExpandedPluginGroups,
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

    const getGroup = (pluginName: string) =>
      host.querySelector<HTMLElement>(`.siyuan-power-buttons__dock-plugin-group[data-plugin-name="${pluginName}"]`);
    const sampleGroup = getGroup('sample')!;
    const plainGroup = getGroup('plain')!;
    expect(sampleGroup).not.toBeNull();
    expect(plainGroup).not.toBeNull();

    const sampleChildren = sampleGroup.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-children')!;
    const sampleHeader = sampleGroup.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-header')!;

    // 1. Default collapsed: children hidden, right-pointing chevron, aria-expanded false, count badge shows 2 commands
    expect(sampleChildren.classList.contains('fn__none')).toBe(true);
    expect(sampleHeader.getAttribute('aria-expanded')).toBe('false');
    // aria-label follows the codebase convention: it names the action the next click performs
    expect(sampleHeader.getAttribute('aria-label')).toBe('展开插件命令');
    expect(sampleGroup.querySelector('.siyuan-power-buttons__dock-plugin-group-chevron')!.innerHTML).toContain('m9 18 6-6-6-6');
    expect(sampleGroup.querySelector('.siyuan-power-buttons__dock-plugin-group-count')?.textContent).toBe('2');

    // 2. Plugin without commands: always expanded, no chevron
    const plainChildren = plainGroup.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-children')!;
    expect(plainChildren.classList.contains('fn__none')).toBe(false);
    expect(plainGroup.querySelector('.siyuan-power-buttons__dock-plugin-group-chevron')).toBeNull();
    expect(plainGroup.querySelector('.siyuan-power-buttons__dock-plugin-group-header')!.getAttribute('aria-expanded')).toBe('true');

    // 3. Header click expands the group and persists the state
    sampleHeader.click();
    expect(sampleChildren.classList.contains('fn__none')).toBe(false);
    expect(sampleHeader.getAttribute('aria-expanded')).toBe('true');
    expect(sampleHeader.getAttribute('aria-label')).toBe('折叠插件命令');
    expect(sampleGroup.querySelector('.siyuan-power-buttons__dock-plugin-group-chevron')!.innerHTML).toContain('m6 9 6 6 6-6');
    expect(setExpandedPluginGroups).toHaveBeenLastCalledWith(['sample']);

    // 4. Clicking a child command still executes instead of toggling the group
    const commandCard = sampleChildren.querySelector<HTMLElement>('[data-action-id="plugin-cmd:sample__cmdOne"]')!;
    commandCard.click();
    expect(setExpandedPluginGroups).toHaveBeenCalledTimes(1);

    // 5. Second header click collapses and persists the empty state
    sampleHeader.click();
    expect(sampleChildren.classList.contains('fn__none')).toBe(true);
    expect(setExpandedPluginGroups).toHaveBeenLastCalledWith([]);
  });

  it('force-expands matched groups during search and restores collapse state after clearing', async () => {
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
        displayName: '样例插件',
        openSetting: vi.fn(),
        commands: [
          { langKey: 'cmdOne', langText: '命令一', callback: vi.fn() },
          { langKey: 'cmdTwo', langText: '命令二', callback: vi.fn() },
        ],
      },
      {
        name: 'plain',
        displayName: '朴素插件',
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

    const uiStateStore = {
      snapshot: () => ({ isPluginListCollapsed: false, expandedPluginGroups: [] }),
      setPluginListCollapsed: vi.fn(),
      setExpandedPluginGroups: vi.fn(),
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

    const input = host.querySelector<HTMLInputElement>('.siyuan-power-buttons__dock-plugin-input')!;
    const getGroup = (pluginName: string) =>
      host.querySelector<HTMLElement>(`.siyuan-power-buttons__dock-plugin-group[data-plugin-name="${pluginName}"]`);

    // Default collapsed
    expect(getGroup('sample')!.querySelector('.siyuan-power-buttons__dock-plugin-group-children')!.classList.contains('fn__none')).toBe(true);

    // 1. Searching a command inside the collapsed group shows the group expanded with only matching children
    input.value = '命令一';
    input.dispatchEvent(new Event('input'));
    const sampleGroup = getGroup('sample')!;
    const sampleChildren = sampleGroup.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-children')!;
    expect(sampleChildren.classList.contains('fn__none')).toBe(false);
    expect(sampleChildren.querySelectorAll('.siyuan-power-buttons__dock-plugin-card').length).toBe(1);
    // Non-matching groups are hidden entirely
    expect(getGroup('plain')).toBeNull();

    // 2. Clearing the search restores the previous collapse state
    const clearBtn = host.querySelector<HTMLButtonElement>('.siyuan-power-buttons__dock-plugin-clear-btn')!;
    clearBtn.click();
    expect(getGroup('sample')!.querySelector('.siyuan-power-buttons__dock-plugin-group-children')!.classList.contains('fn__none')).toBe(true);
    expect(getGroup('plain')).not.toBeNull();
  });

  it('renders groups expanded according to the persisted expanded state', async () => {
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
        displayName: '样例插件',
        openSetting: vi.fn(),
        commands: [
          { langKey: 'cmdOne', langText: '命令一', callback: vi.fn() },
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

    const uiStateStore = {
      snapshot: () => ({ isPluginListCollapsed: false, expandedPluginGroups: ['sample'] }),
      setPluginListCollapsed: vi.fn(),
      setExpandedPluginGroups: vi.fn(),
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

    const sampleGroup = host.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group[data-plugin-name="sample"]')!;
    const sampleChildren = sampleGroup.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-children')!;
    const sampleHeader = sampleGroup.querySelector<HTMLElement>('.siyuan-power-buttons__dock-plugin-group-header')!;

    expect(sampleChildren.classList.contains('fn__none')).toBe(false);
    expect(sampleHeader.getAttribute('aria-expanded')).toBe('true');
    expect(sampleHeader.getAttribute('aria-label')).toBe('折叠插件命令');
    expect(sampleGroup.querySelector('.siyuan-power-buttons__dock-plugin-group-chevron')!.innerHTML).toContain('m6 9 6 6 6-6');
  });
});
