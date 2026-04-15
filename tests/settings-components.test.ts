// @vitest-environment jsdom

import { createApp, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultConfig } from '@/core/config/defaults';
import SettingsButtonListPanel from '@/features/settings/components/SettingsButtonListPanel.vue';

describe('settings components', () => {
  it('renders the button list panel and forwards list actions through props', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const config = createDefaultConfig();
    const addItem = vi.fn();
    const duplicateItem = vi.fn();
    const selectItem = vi.fn();
    const toggleVisible = vi.fn();
    const removeItem = vi.fn();
    const exportConfigFile = vi.fn();
    const openImportFilePicker = vi.fn();

    const app = createApp(SettingsButtonListPanel, {
      config,
      selectedId: config.items[0].id,
      selectedItem: config.items[0],
      importFileInput: ref<HTMLInputElement | null>(null),
      renderBuiltinIconMarkup: () => '<svg viewBox="0 0 24 24"></svg>',
      surfaceLabel: (value: string) => value,
      addItem,
      duplicateItem,
      selectItem,
      toggleVisible,
      removeItem,
      onListDragStart: vi.fn(),
      onListDrop: vi.fn(),
      exportConfigFile,
      openImportFilePicker,
      handleImportFile: vi.fn(),
    });

    app.mount(target);
    await nextTick();

    expect(target.textContent).toContain('2 个按钮');

    const listButtons = Array.from(target.querySelectorAll<HTMLButtonElement>('.button-list__main'));
    listButtons[1]?.click();
    target.querySelector<HTMLButtonElement>('.panel-title__actions .b3-button')?.click();
    target.querySelector<HTMLButtonElement>('.panel-title__actions .b3-button--outline')?.click();
    target.querySelector<HTMLButtonElement>('.config-transfer__actions .b3-button--outline')?.click();
    target.querySelector<HTMLButtonElement>('.switch-button--compact')?.click();
    target.querySelector<HTMLButtonElement>('.button-list__delete')?.click();

    expect(selectItem).toHaveBeenCalledWith(config.items[1].id);
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(duplicateItem).toHaveBeenCalledTimes(1);
    expect(exportConfigFile).toHaveBeenCalledTimes(1);
    expect(toggleVisible).toHaveBeenCalledWith(config.items[0].id);
    expect(removeItem).toHaveBeenCalledWith(config.items[0].id);

    app.unmount();
  });
});
