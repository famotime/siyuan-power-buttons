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
});
