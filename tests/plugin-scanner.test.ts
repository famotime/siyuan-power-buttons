// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { scanPluginEntries } from '@/core/plugins/plugin-scanner';

describe('scanPluginEntries', () => {
  it('returns empty array if plugins is empty or invalid', () => {
    expect(scanPluginEntries(undefined)).toEqual([]);
    expect(scanPluginEntries([])).toEqual([]);
  });

  it('scans setting, topbar and command entries from mock plugins', () => {
    const mockTopBarEl = document.createElement('div');
    mockTopBarEl.setAttribute('data-id', 'tb-main');
    mockTopBarEl.setAttribute('aria-label', '快速剪藏');
    mockTopBarEl.innerHTML = '<svg><use xlink:href="#iconClipper"></use></svg>';

    const plugins = [
      {
        name: 'siyuan-plugin-sample',
        displayName: '样例插件',
        openSetting: vi.fn(),
        topBarIcons: [mockTopBarEl],
        commands: [
          {
            langKey: 'sampleCommand',
            langText: '执行样例动作',
            callback: vi.fn(),
          },
        ],
      },
    ];

    const entries = scanPluginEntries(plugins);
    expect(entries).toHaveLength(3);

    const settingEntry = entries.find(e => e.type === 'setting');
    expect(settingEntry).toBeDefined();
    expect(settingEntry?.actionId).toBe('plugin-setting:siyuan-plugin-sample');
    expect(settingEntry?.title).toBe('样例插件 设置');

    const topbarEntry = entries.find(e => e.type === 'topbar');
    expect(topbarEntry).toBeDefined();
    expect(topbarEntry?.actionId).toBe('plugin-topbar:siyuan-plugin-sample__tb-main');
    expect(topbarEntry?.title).toBe('快速剪藏');
    expect(topbarEntry?.iconType).toBe('svg');
    expect(topbarEntry?.iconValue).toBe('iconClipper');

    const commandEntry = entries.find(e => e.type === 'command');
    expect(commandEntry).toBeDefined();
    expect(commandEntry?.actionId).toBe('plugin-cmd:siyuan-plugin-sample__sampleCommand');
    expect(commandEntry?.title).toBe('执行样例动作');
  });

  it('scans dock entries from mock plugins and extracts dock icon correctly', () => {
    const plugins = [
      {
        name: 'siyuan-plugin-calendar',
        displayName: '日历插件',
        docks: {
          'siyuan-plugin-calendar_dock': {
            id: 'calendar_dock',
            config: {
              title: '日程侧栏',
              icon: '#iconCalendar',
              position: 'LeftTop',
            },
          },
          'siyuan-plugin-calendar_task': {
            id: 'task_dock',
            config: {
              title: '任务列表',
              icon: 'iconCheck',
            },
          },
        },
      },
    ];

    const entries = scanPluginEntries(plugins);
    expect(entries).toHaveLength(2);

    const dock1 = entries.find(e => e.actionId === 'plugin-dock:siyuan-plugin-calendar__siyuan-plugin-calendar_dock');
    expect(dock1).toBeDefined();
    expect(dock1?.type).toBe('dock');
    expect(dock1?.title).toBe('日程侧栏');
    expect(dock1?.iconType).toBe('svg');
    expect(dock1?.iconValue).toBe('iconCalendar');

    const dock2 = entries.find(e => e.actionId === 'plugin-dock:siyuan-plugin-calendar__siyuan-plugin-calendar_task');
    expect(dock2).toBeDefined();
    expect(dock2?.type).toBe('dock');
    expect(dock2?.title).toBe('任务列表');
    expect(dock2?.iconType).toBe('svg');
    expect(dock2?.iconValue).toBe('iconCheck');
  });

  it('safely handles non-string and multi-language displayName in plugins and installedPackages', () => {
    const plugins = [
      {
        name: 'active-plugin',
        displayName: { zh_CN: '活动插件中文名', default: 'Active Plugin' } as never,
        openSetting: vi.fn(),
      },
    ];

    const installedPackages = [
      {
        name: 'active-plugin',
        displayName: { zh_CN: '活动插件中文名', default: 'Active Plugin' },
        enabled: true,
      },
      {
        name: 'disabled-plugin',
        displayName: { zh_CN: '停用插件中文名', default: 'Disabled Plugin' },
        preferredName: '停用插件中文名',
        enabled: false,
      },
      {
        name: 'pkg-with-default-only',
        displayName: { default: 'Default Only Plugin' },
        enabled: false,
      },
      {
        name: 'pkg-with-weird-type',
        displayName: 12345 as never,
        enabled: false,
      },
    ];

    const entries = scanPluginEntries(plugins as never, installedPackages);
    expect(entries).toHaveLength(4);

    const activeEntry = entries.find(e => e.pluginName === 'active-plugin');
    expect(activeEntry?.pluginDisplayName).toBe('活动插件中文名');

    const disabledEntry = entries.find(e => e.pluginName === 'disabled-plugin');
    expect(disabledEntry?.pluginDisplayName).toBe('停用插件中文名');
    expect(disabledEntry?.enabled).toBe(false);

    const defaultOnlyEntry = entries.find(e => e.pluginName === 'pkg-with-default-only');
    expect(defaultOnlyEntry?.pluginDisplayName).toBe('Default Only Plugin');

    const weirdEntry = entries.find(e => e.pluginName === 'pkg-with-weird-type');
    expect(weirdEntry?.pluginDisplayName).toBe('pkg-with-weird-type');
  });
});
