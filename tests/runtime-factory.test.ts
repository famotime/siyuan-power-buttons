// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import type { ExperimentalFeatureKey } from '@/core/compatibility/version-guard';
import { createButtonItem } from '@/core/config/defaults';
import {
  collectInstalledPlugins,
  createExperimentalActionRunners,
} from '@/core/runtime/runtime-factory';

describe('runtime factory helpers', () => {
  it('deduplicates app and global plugin lists while preserving the first occurrence', () => {
    const sharedPlugin = {
      name: 'shared-plugin',
      getPowerButtonsIntegration: vi.fn(),
    };
    const appOnlyPlugin = {
      name: 'app-only-plugin',
      getPowerButtonsIntegration: vi.fn(),
    };
    const globalOnlyPlugin = {
      name: 'global-only-plugin',
      getPowerButtonsIntegration: vi.fn(),
    };

    expect(collectInstalledPlugins([sharedPlugin, appOnlyPlugin], [sharedPlugin, globalOnlyPlugin])).toEqual([
      sharedPlugin,
      appOnlyPlugin,
      globalOnlyPlugin,
    ]);
    expect(collectInstalledPlugins([], [])).toBeUndefined();
  });

  it('shows the support reason and short-circuits shortcut execution when the feature is unavailable', async () => {
    const showMessage = vi.fn();
    const executeShortcut = vi.fn();
    const runners = createExperimentalActionRunners({
      getExperimentalSupport: (_feature: ExperimentalFeatureKey) => ({
        supported: false,
        reason: '实验快捷键适配当前未启用。',
      }),
      showMessage,
      getKeymap: vi.fn(),
      pluginGlobalCommand: vi.fn(),
      pluginCommandHandlers: new Map(),
      runBuiltinCommandByDom: vi.fn(),
      executeExperimentalShortcut: executeShortcut,
      executeExperimentalClickSequence: vi.fn(),
      document,
      windowTarget: window,
    });

    const result = await runners.runExperimentalShortcut(createButtonItem({
      actionType: 'experimental-shortcut',
      actionId: 'Ctrl+B',
      experimentalShortcut: {
        shortcut: 'Ctrl+B',
        sendEscapeBefore: false,
        dispatchTarget: 'auto',
        allowDirectWindowDispatch: false,
      },
    }));

    expect(result).toBe(true);
    expect(showMessage).toHaveBeenCalledWith('实验快捷键适配当前未启用。', 5000, 'error');
    expect(executeShortcut).not.toHaveBeenCalled();
  });
});
