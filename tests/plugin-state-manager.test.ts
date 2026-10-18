import { describe, expect, it, vi } from 'vitest';
import { PluginStateManager } from '@/core/plugins/plugin-state-manager';

describe('PluginStateManager', () => {
  it('correctly reports isPluginEnabled based on active plugins and state map', () => {
    const activePlugins = [{ name: 'plugin-a', displayName: 'Plugin A' }];
    const manager = new PluginStateManager({
      getActivePlugins: () => activePlugins,
    });

    expect(manager.isPluginEnabled('plugin-a')).toBe(true);
    expect(manager.isPluginEnabled('plugin-b')).toBe(false);

    manager.setInstalledPackages([
      { name: 'plugin-a', displayName: 'Plugin A', enabled: true },
      { name: 'plugin-b', displayName: 'Plugin B', enabled: false },
    ]);

    expect(manager.isPluginEnabled('plugin-a')).toBe(true);
    expect(manager.isPluginEnabled('plugin-b')).toBe(false);
  });

  it('scans entries with enabled status', () => {
    const activePlugins = [
      {
        name: 'active-plugin',
        displayName: 'Active Plugin',
        openSetting: vi.fn(),
      },
    ];
    const manager = new PluginStateManager({
      getActivePlugins: () => activePlugins,
    });
    manager.setInstalledPackages([
      { name: 'active-plugin', displayName: 'Active Plugin', enabled: true },
      { name: 'disabled-plugin', displayName: 'Disabled Plugin', enabled: false },
    ]);

    const entries = manager.scanEntries(activePlugins as never);
    const activeEntry = entries.find(e => e.pluginName === 'active-plugin');
    const disabledEntry = entries.find(e => e.pluginName === 'disabled-plugin');

    expect(activeEntry).toBeDefined();
    expect(activeEntry?.enabled).toBe(true);

    expect(disabledEntry).toBeDefined();
    expect(disabledEntry?.enabled).toBe(false);
  });

  it('fetches installed packages via bazaar api and notifies listeners', async () => {
    const listener = vi.fn();
    const fetchPost = vi.fn().mockResolvedValue({
      code: 0,
      data: {
        packages: [
          { name: 'pkg-1', displayName: { zh_CN: '插件一', default: 'Package 1' }, preferredName: '插件一', enabled: true, version: '1.0.0' },
          { name: 'pkg-2', displayName: { default: 'Package 2' }, enabled: false, version: '2.0.0' },
        ],
      },
    });

    const manager = new PluginStateManager({
      fetchPost,
      getFrontend: () => 'desktop',
    });

    const unsubscribe = manager.subscribe(listener);
    await manager.fetchInstalledPackages();

    expect(fetchPost).toHaveBeenCalledWith('/api/bazaar/getInstalledPlugin', { frontend: 'desktop' });
    expect(listener).toHaveBeenCalled();
    expect(manager.isPluginEnabled('pkg-1')).toBe(true);
    expect(manager.isPluginEnabled('pkg-2')).toBe(false);

    unsubscribe();
  });

  it('toggles plugin enabled status via petal api and notifies', async () => {
    const notify = vi.fn();
    const listener = vi.fn();
    const fetchPost = vi.fn().mockResolvedValue({
      code: 0,
      msg: '',
    });

    const manager = new PluginStateManager({
      fetchPost,
      notify,
      t: (key, rep) => `${key}:${rep?.name || rep?.message || ''}`,
    });

    manager.setInstalledPackages([
      { name: 'test-plugin', displayName: '测试插件', enabled: true },
    ]);

    manager.subscribe(listener);

    // 1. Toggle to disabled
    const result1 = await manager.togglePluginEnabled('test-plugin', false);
    expect(result1).toBe(true);
    expect(fetchPost).toHaveBeenCalledWith('/api/petal/setPetalEnabled', {
      packageName: 'test-plugin',
      enabled: false,
    });
    expect(manager.isPluginEnabled('test-plugin')).toBe(false);
    expect(notify).toHaveBeenCalledWith('pluginDisabledSuccess:测试插件', 'info');
    expect(listener).toHaveBeenCalled();

    // 2. Toggle to enabled
    const result2 = await manager.togglePluginEnabled('test-plugin', true);
    expect(result2).toBe(true);
    expect(fetchPost).toHaveBeenCalledWith('/api/petal/setPetalEnabled', {
      packageName: 'test-plugin',
      enabled: true,
    });
    expect(manager.isPluginEnabled('test-plugin')).toBe(true);
    expect(notify).toHaveBeenCalledWith('pluginEnabledSuccess:测试插件', 'info');
  });

  it('handles toggle failure gracefully and notifies error', async () => {
    const notify = vi.fn();
    const fetchPost = vi.fn().mockResolvedValue({
      code: -1,
      msg: 'Server internal error',
    });

    const manager = new PluginStateManager({
      fetchPost,
      notify,
      t: (key, rep) => `${key}:${rep?.message || ''}`,
    });

    manager.setInstalledPackages([
      { name: 'failed-plugin', displayName: '失败插件', enabled: true },
    ]);

    const result = await manager.togglePluginEnabled('failed-plugin', false);
    expect(result).toBe(false);
    expect(manager.isPluginEnabled('failed-plugin')).toBe(true);
    expect(notify).toHaveBeenCalledWith('togglePluginFailed:Server internal error', 'error');
  });

  it('handles ws-main reloadPlugin push events to keep state in sync', () => {
    const listener = vi.fn();
    const manager = new PluginStateManager();
    manager.setInstalledPackages([
      { name: 'plugin-1', displayName: 'P1', enabled: true },
      { name: 'plugin-2', displayName: 'P2', enabled: false },
      { name: 'plugin-3', displayName: 'P3', enabled: true },
    ]);

    manager.subscribe(listener);

    manager.handleWsReloadPlugin({
      unloadPlugins: ['plugin-1'],
      reloadPlugins: ['plugin-2'],
      uninstallPlugins: ['plugin-3'],
    });

    expect(manager.isPluginEnabled('plugin-1')).toBe(false);
    expect(manager.isPluginEnabled('plugin-2')).toBe(true);
    expect(manager.isPluginEnabled('plugin-3')).toBe(false);
    expect(listener).toHaveBeenCalled();
  });
});
