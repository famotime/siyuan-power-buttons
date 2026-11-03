import { describe, expect, it, vi } from 'vitest';
import { SettingsUiStateStore } from '@/core/config';

describe('settings UI state store', () => {
  it('loads an empty selected-button state when no UI state file exists', async () => {
    const plugin = {
      loadData: vi.fn().mockResolvedValue(null),
      saveData: vi.fn().mockResolvedValue(undefined),
    } as never;

    const store = new SettingsUiStateStore(plugin);
    const state = await store.load();

    expect(state).toEqual({ lastSelectedButtonId: '', isPluginListCollapsed: false, expandedPluginGroups: [] });
  });

  it('persists lastSelectedButtonId independently of the main config store', async () => {
    const plugin = {
      loadData: vi.fn().mockResolvedValue(null),
      saveData: vi.fn().mockResolvedValue(undefined),
    } as never;

    const store = new SettingsUiStateStore(plugin);
    await store.load();
    await store.setLastSelectedButtonId('daily-note-button');

    expect(plugin.saveData).toHaveBeenLastCalledWith('settings-ui.json', {
      lastSelectedButtonId: 'daily-note-button',
      isPluginListCollapsed: false,
      expandedPluginGroups: [],
    });
  });

  it('persists isPluginListCollapsed independently', async () => {
    const plugin = {
      loadData: vi.fn().mockResolvedValue(null),
      saveData: vi.fn().mockResolvedValue(undefined),
    } as never;

    const store = new SettingsUiStateStore(plugin);
    await store.load();
    await store.setPluginListCollapsed(true);

    expect(plugin.saveData).toHaveBeenLastCalledWith('settings-ui.json', {
      lastSelectedButtonId: '',
      isPluginListCollapsed: true,
      expandedPluginGroups: [],
    });
  });

  it('persists expanded plugin groups and sanitizes legacy or corrupted values', async () => {
    const plugin = {
      loadData: vi
        .fn()
        .mockResolvedValueOnce({ lastSelectedButtonId: '', isPluginListCollapsed: false, expandedPluginGroups: ['sample', 42, null] })
        .mockResolvedValueOnce(null),
      saveData: vi.fn().mockResolvedValue(undefined),
    } as never;

    // 非字符串项会被过滤掉
    const corruptedStore = new SettingsUiStateStore(plugin);
    const corruptedState = await corruptedStore.load();
    expect(corruptedState.expandedPluginGroups).toEqual(['sample']);

    // 缺失字段时回退为空数组，并支持整组写入持久化
    const store = new SettingsUiStateStore(plugin);
    await store.load();
    await store.setExpandedPluginGroups(['sample', 'plain']);

    expect(plugin.saveData).toHaveBeenLastCalledWith('settings-ui.json', {
      lastSelectedButtonId: '',
      isPluginListCollapsed: false,
      expandedPluginGroups: ['sample', 'plain'],
    });
  });
});
