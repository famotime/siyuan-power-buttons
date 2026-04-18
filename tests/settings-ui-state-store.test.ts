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

    expect(state).toEqual({ lastSelectedButtonId: '' });
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
    });
  });
});
