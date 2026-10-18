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
});
