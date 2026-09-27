// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeOpenSetting = vi.fn();
let externalRegistryOptions: { getPlugins?: () => unknown } | undefined;

vi.mock('@/core/config', () => ({
  ConfigStore: class MockConfigStore {
    load = vi.fn().mockResolvedValue({});
    getConfig = vi.fn(() => ({ desktopOnly: true }));
    snapshot = vi.fn(() => ({}));
    replace = vi.fn();
    reset = vi.fn();
    subscribe = vi.fn(() => vi.fn());
  },
  SettingsUiStateStore: class MockSettingsUiStateStore {
    load = vi.fn().mockResolvedValue({ lastSelectedButtonId: '' });
    snapshot = vi.fn(() => ({ lastSelectedButtonId: '' }));
    setLastSelectedButtonId = vi.fn().mockResolvedValue(undefined);
  },
  exportConfigAsJson: vi.fn(() => '{}'),
}));

vi.mock('@/core/compatibility/version-guard', () => ({
  getExperimentalFeatureSupport: vi.fn(() => ({ supported: true })),
}));

vi.mock('@/core/commands', () => ({
  BUILTIN_COMMANDS: [],
  CommandExecutor: class MockCommandExecutor {},
  ExternalCommandRegistry: class MockExternalCommandRegistry {
    constructor(options: { getPlugins: () => unknown }) {
      externalRegistryOptions = options;
    }
  },
  executeExperimentalClickSequence: vi.fn(),
  executeExperimentalShortcut: vi.fn(),
  executeBuiltinCommandByDom: vi.fn(),
  PLUGIN_COMMANDS: [],
}));

vi.mock('@/core/runtime/plugin-runtime', () => ({
  PowerButtonsRuntime: class MockPowerButtonsRuntime {
    openSetting = runtimeOpenSetting;
    onload = vi.fn();
    onLayoutReady = vi.fn();
    onunload = vi.fn();
  },
}));

vi.mock('@/core/runtime/settings-dialog-controller', () => ({
  SettingsDialogController: class MockSettingsDialogController {},
}));

vi.mock('@/core/system/app-version', () => ({
  getAppVersion: vi.fn(),
}));

vi.mock('@/core/surfaces', () => ({
  SurfaceManager: class MockSurfaceManager {},
}));

vi.mock('@/main', () => ({
  mountSettingsApp: vi.fn(),
}));

vi.mock('@/shared/runtime-snapshot', () => ({
  readNativeSurfaceSnapshot: vi.fn(),
}));

describe('plugin fixed settings entry', () => {
  beforeEach(() => {
    runtimeOpenSetting.mockReset();
    externalRegistryOptions = undefined;
    delete (window as typeof window & { siyuan?: unknown }).siyuan;
  });

  it('delegates plugin openSetting to the runtime settings dialog', async () => {
    const { default: SiyuanPowerButtonsPlugin } = await import('@/index');
    const plugin = new SiyuanPowerButtonsPlugin();

    plugin.openSetting();

    expect(runtimeOpenSetting).toHaveBeenCalledTimes(1);
  });

  it('falls back to window.siyuan.ws.app.plugins for external plugin discovery', async () => {
    const externalPlugin = {
      name: 'siyuan-doc-assist',
      getPowerButtonsIntegration: vi.fn(),
    };
    (window as typeof window & {
      siyuan?: { ws?: { app?: { plugins?: unknown[] } } };
    }).siyuan = {
      ws: {
        app: {
          plugins: [externalPlugin],
        },
      },
    };

    const { default: SiyuanPowerButtonsPlugin } = await import('@/index');
    const plugin = new SiyuanPowerButtonsPlugin();
    plugin.app = { plugins: [] } as never;

    const discoveredPlugins = externalRegistryOptions?.getPlugins?.();

    expect(Array.isArray(discoveredPlugins)).toBe(true);
    expect(discoveredPlugins).toContain(externalPlugin);
  });

  it('removes persisted config files during uninstall', async () => {
    const { default: SiyuanPowerButtonsPlugin } = await import('@/index');
    const plugin = new SiyuanPowerButtonsPlugin();

    await plugin.uninstall();

    expect(plugin.removeData).toHaveBeenCalledTimes(2);
    expect(plugin.removeData).toHaveBeenNthCalledWith(1, 'settings.json');
    expect(plugin.removeData).toHaveBeenNthCalledWith(2, 'settings-ui.json');
  });

  it('translates keys using this.i18n, fallbacks to zh_CN or key, and replaces placeholders', async () => {
    const { default: SiyuanPowerButtonsPlugin } = await import('@/index');
    const plugin = new SiyuanPowerButtonsPlugin();

    // 1. Without this.i18n, fallback to embedded zh_CN.json
    expect(plugin.t('copiedServerUrlToClipboard')).toBe('伺服地址已复制到剪贴板');
    expect(plugin.t('pluginCommandFailed', { commandId: 'test-cmd' })).toBe('插件命令执行失败：test-cmd');
    expect(plugin.t('nonExistentKey')).toBe('nonExistentKey');

    // 2. With this.i18n provided by Siyuan host
    plugin.i18n = {
      copiedServerUrlToClipboard: 'Server URL copied to clipboard',
      customGreeting: 'Hello {name}!',
    };
    expect(plugin.t('copiedServerUrlToClipboard')).toBe('Server URL copied to clipboard');
    expect(plugin.t('customGreeting', { name: 'World' })).toBe('Hello World!');
  });
});
