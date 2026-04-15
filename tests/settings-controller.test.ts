// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { formatExternalCommandActionId } from '@/core/commands';
import { createButtonItem, createDefaultConfig } from '@/core/config/defaults';
import { useSettingsController } from '@/features/settings/use-settings-controller';
import type { SettingsAppProps } from '@/features/settings/types';

function createProps(overrides: Partial<SettingsAppProps> = {}): SettingsAppProps {
  return {
    initialConfig: createDefaultConfig(),
    builtinCommands: [],
    pluginCommands: [],
    externalCommandProviders: [],
    onChange: vi.fn().mockResolvedValue(undefined),
    onNotify: vi.fn(),
    onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createDragStartEvent(target: HTMLElement): DragEvent {
  const event = new Event('dragstart', { bubbles: true }) as DragEvent;
  Object.defineProperty(event, 'currentTarget', {
    configurable: true,
    value: target,
  });
  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: {
      effectAllowed: 'all',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    },
  });
  return event;
}

describe('settings controller', () => {
  it('restores the default config after confirmation and persists it', async () => {
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: 'custom-only',
        title: '自定义按钮',
        surface: 'canvas',
        order: 0,
      }),
    ];

    const onChange = vi.fn().mockResolvedValue(undefined);
    const onReadCurrentLayout = vi.fn().mockResolvedValue([]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const controller = useSettingsController(createProps({
      initialConfig,
      onChange,
      onReadCurrentLayout,
    }));

    await controller.resetConfig();

    const persistedConfig = onChange.mock.calls.at(-1)?.[0];
    expect(confirmSpy).toHaveBeenCalledWith('确定恢复默认按钮配置吗？');
    expect(onReadCurrentLayout).toHaveBeenCalledTimes(1);
    expect(persistedConfig?.items.map((item: { title: string }) => item.title)).toEqual(['全局搜索', '大纲']);
    expect(controller.selectedId.value).toBe(persistedConfig?.items[0]?.id);
  });

  it('moves a native preview button into the disabled tray and persists the suppression rule', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      onChange,
      onReadCurrentLayout: vi.fn().mockResolvedValue([
        {
          id: 'native-canvas-pin-preview',
          title: '钉住编辑区',
          visible: true,
          surface: 'canvas',
          order: 0,
          editable: false,
          source: 'native',
          iconMarkup: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>',
          nativeSelectors: ['#native-canvas-pin', "[data-type='readonly']"],
        },
      ]),
    }));

    await controller.initialize();

    const nativeItem = controller.previewLayout.value.canvas[0];
    expect(nativeItem?.editable).toBe(false);

    const dragTarget = document.createElement('button');
    document.body.appendChild(dragTarget);
    controller.onPreviewDragStart(createDragStartEvent(dragTarget), nativeItem);
    await controller.onDisabledNativeDrop();

    const persistedConfig = onChange.mock.calls.at(-1)?.[0];
    expect(persistedConfig?.disabledNativeButtons).toEqual([
      {
        id: 'native-canvas-pin-preview',
        title: '钉住编辑区',
        surface: 'canvas',
        selectors: ['#native-canvas-pin', "[data-type='readonly']"],
        iconMarkup: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>',
      },
    ]);
  });

  it('moves an editable preview button to a different surface and persists the new location', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      onChange,
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    }));

    await controller.initialize();

    const editableItem = controller.previewLayout.value.topbar[0];
    expect(editableItem?.editable).toBe(true);

    const dragTarget = document.createElement('button');
    document.body.appendChild(dragTarget);
    controller.onPreviewDragStart(createDragStartEvent(dragTarget), editableItem);
    await controller.onPreviewSurfaceDrop('canvas');

    const persistedConfig = onChange.mock.calls.at(-1)?.[0];
    expect(persistedConfig?.items.find((item: { id: string }) => item.id === editableItem.itemId)?.surface).toBe('canvas');
  });

  it('refreshes external providers and rewrites an invalid plugin command selection', async () => {
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: 'plugin-only',
        title: '插件按钮',
        actionType: 'plugin-command',
        actionId: formatExternalCommandActionId('missing-provider', 'missing-command'),
        order: 0,
      }),
    ];

    const onChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      initialConfig,
      onChange,
      externalCommandProviders: [],
      onRefreshExternalCommands: vi.fn().mockResolvedValue([
        {
          providerId: 'siyuan-doc-assist',
          providerName: '文档助手 / Doc Assist',
          commands: [
            {
              id: 'insert-doc-summary',
              title: '插入文档摘要',
            },
          ],
        },
      ]),
    }));

    await controller.refreshExternalProviders();

    const persistedConfig = onChange.mock.calls.at(-1)?.[0];
    expect(persistedConfig?.items[0]?.actionId).toBe(
      formatExternalCommandActionId('siyuan-doc-assist', 'insert-doc-summary'),
    );
  });
});
