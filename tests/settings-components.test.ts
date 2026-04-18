// @vitest-environment jsdom

import { createApp, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultConfig } from '@/core/config/defaults';
import ConfigTransferPanel from '@/features/settings/components/ConfigTransferPanel.vue';
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

    const app = createApp(SettingsButtonListPanel, {
      config,
      selectedId: config.items[0].id,
      selectedItem: config.items[0],
      renderBuiltinIconMarkup: () => '<svg viewBox="0 0 24 24"></svg>',
      surfaceLabel: (value: string) => value,
      addItem,
      duplicateItem,
      selectItem,
      toggleVisible,
      removeItem,
      onListDragStart: vi.fn(),
      onListDrop: vi.fn(),
    });

    app.mount(target);
    await nextTick();

    expect(target.textContent).toContain(`${config.items.length} 个按钮`);

    const listButtons = Array.from(target.querySelectorAll<HTMLButtonElement>('.button-list__main'));
    listButtons[1]?.click();
    target.querySelector<HTMLButtonElement>('.panel-title__actions .b3-button')?.click();
    target.querySelector<HTMLButtonElement>('.panel-title__actions .b3-button--outline')?.click();
    target.querySelector<HTMLButtonElement>('.switch-button--compact')?.click();
    target.querySelector<HTMLButtonElement>('.button-list__delete')?.click();

    expect(selectItem).toHaveBeenCalledWith(config.items[1].id);
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(duplicateItem).toHaveBeenCalledTimes(1);
    expect(toggleVisible).toHaveBeenCalledWith(config.items[0].id);
    expect(removeItem).toHaveBeenCalledWith(config.items[0].id);
    expect(target.textContent).not.toContain('配置文件');

    app.unmount();
  });

  it('renders the config transfer panel and forwards file actions through props', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const exportConfigFile = vi.fn();
    const openImportFilePicker = vi.fn();
    const handleImportFile = vi.fn();

    const app = createApp(ConfigTransferPanel, {
      importFileInput: ref<HTMLInputElement | null>(null),
      exportConfigFile,
      openImportFilePicker,
      handleImportFile,
    });

    app.mount(target);
    await nextTick();

    expect(target.textContent).toContain('配置文件');
    expect(target.textContent).toContain('导入或导出所有已配置按钮');

    const actionButtons = Array.from(target.querySelectorAll<HTMLButtonElement>('.config-transfer__actions .b3-button--outline'));
    actionButtons[0]?.click();
    actionButtons[1]?.click();

    const fileInput = target.querySelector<HTMLInputElement>('.config-transfer__input');
    fileInput?.dispatchEvent(new Event('change'));

    expect(exportConfigFile).toHaveBeenCalledTimes(1);
    expect(openImportFilePicker).toHaveBeenCalledTimes(1);
    expect(handleImportFile).toHaveBeenCalledTimes(1);

    app.unmount();
  });

  it('renders the delete action with a stroked trash icon instead of a filled block', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const config = createDefaultConfig();

    const app = createApp(SettingsButtonListPanel, {
      config,
      selectedId: config.items[0].id,
      selectedItem: config.items[0],
      renderBuiltinIconMarkup: () => '<svg viewBox="0 0 24 24"></svg>',
      surfaceLabel: (value: string) => value,
      addItem: vi.fn(),
      duplicateItem: vi.fn(),
      selectItem: vi.fn(),
      toggleVisible: vi.fn(),
      removeItem: vi.fn(),
      onListDragStart: vi.fn(),
      onListDrop: vi.fn(),
    });

    app.mount(target);
    await nextTick();

    const deleteIconMarkup = target.querySelector<HTMLButtonElement>('.button-list__delete')?.innerHTML || '';

    expect(deleteIconMarkup).toContain('stroke="currentColor"');
    expect(deleteIconMarkup).toContain('fill:none');

    app.unmount();
  });
});
