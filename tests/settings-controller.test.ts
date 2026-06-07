// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { formatExternalCommandActionId } from '@/core/commands';
import { createButtonItem, createDefaultConfig } from '@/core/config/defaults';
import { useSettingsController } from '@/features/settings/use-settings-controller';
import type { SettingsAppProps } from '@/features/settings/types';

function createProps(overrides: Partial<SettingsAppProps> = {}): SettingsAppProps {
  return {
    initialConfig: createDefaultConfig(),
    initialSelectedButtonId: '',
    builtinCommands: [],
    pluginCommands: [],
    externalCommandProviders: [],
    onChange: vi.fn().mockResolvedValue(undefined),
    onNotify: vi.fn(),
    onSelectedIdChange: vi.fn().mockResolvedValue(undefined),
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
  it('restores the previously selected button when the id still exists', () => {
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: 'first',
        title: '第一个',
        order: 0,
      }),
      createButtonItem({
        id: 'second',
        title: '第二个',
        order: 1,
      }),
    ];

    const controller = useSettingsController(createProps({
      initialConfig,
      initialSelectedButtonId: 'second',
    }));

    expect(controller.selectedId.value).toBe('second');
    expect(controller.selectedItem.value?.title).toBe('第二个');
  });

  it('falls back to the first button and persists that fallback when the stored id is stale', async () => {
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: 'first',
        title: '第一个',
        order: 0,
      }),
      createButtonItem({
        id: 'second',
        title: '第二个',
        order: 1,
      }),
    ];

    const onSelectedIdChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      initialConfig,
      initialSelectedButtonId: 'missing',
      onSelectedIdChange,
    }));

    expect(controller.selectedId.value).toBe('first');
    await Promise.resolve();
    expect(onSelectedIdChange).toHaveBeenCalledWith('first');
  });

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
    expect(persistedConfig?.items.map((item: { title: string }) => item.title)).toEqual(
      createDefaultConfig().items.map(item => item.title),
    );
    expect(controller.selectedId.value).toBe(persistedConfig?.items[0]?.id);
  });

  it('clicking a native preview button toggles suppression and persists the rule', async () => {
    const initialConfig = createDefaultConfig();
    initialConfig.disabledNativeButtons = [];
    const onChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      initialConfig,
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
    expect(nativeItem?.suppressed).toBe(false);

    // 点击禁用
    await controller.handlePreviewChipClick(nativeItem);

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

    // 禁用后仍显示在预览中，但标记为 suppressed
    const suppressedItem = controller.previewLayout.value.canvas.find(
      (item: { id: string }) => item.id === 'native-canvas-pin-preview',
    );
    expect(suppressedItem?.suppressed).toBe(true);

    // 再次点击恢复
    await controller.handlePreviewChipClick(suppressedItem);

    const restoredConfig = onChange.mock.calls.at(-1)?.[0];
    expect(restoredConfig?.disabledNativeButtons).toEqual([]);
  });

  it('moves an editable preview button to a different surface and persists the new location', async () => {
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: 'topbar-item',
        title: '顶部按钮',
        surface: 'topbar',
        order: 0,
      }),
    ];
    const onChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      initialConfig,
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

  it('inserts an externally dragged preview button at the targeted selection toolbar position', async () => {
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: 'topbar-item',
        title: '顶部按钮',
        surface: 'topbar',
        order: 0,
      }),
      createButtonItem({
        id: 'selection-first',
        title: '浮动按钮 A',
        surface: 'selection-toolbar',
        order: 1,
      }),
      createButtonItem({
        id: 'selection-second',
        title: '浮动按钮 B',
        surface: 'selection-toolbar',
        order: 2,
      }),
    ];
    const onChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      initialConfig,
      onChange,
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    }));

    await controller.initialize();

    const editableItem = controller.previewLayout.value.topbar[0];
    const dragTarget = document.createElement('button');
    document.body.appendChild(dragTarget);
    controller.onPreviewDragStart(createDragStartEvent(dragTarget), editableItem);
    await controller.onSelectionToolbarDrop(1);

    const persistedConfig = onChange.mock.calls.at(-1)?.[0];
    expect(
      persistedConfig?.items
        .filter((item: { surface: string }) => item.surface === 'selection-toolbar')
        .map((item: { title: string }) => item.title),
    ).toEqual(['浮动按钮 A', '顶部按钮', '浮动按钮 B']);
  });

  it('reorders native selection toolbar buttons and persists the mixed layout', async () => {
    const initialConfig = createDefaultConfig() as ReturnType<typeof createDefaultConfig> & {
      selectionToolbarLayout: Array<{ type: 'native' | 'custom'; id: string }>;
    };
    initialConfig.selectionToolbarLayout = [
      { type: 'native', id: 'strong' },
      { type: 'native', id: 'em' },
    ];
    const onChange = vi.fn().mockResolvedValue(undefined);
    const controller = useSettingsController(createProps({
      initialConfig,
      onChange,
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    })) as ReturnType<typeof useSettingsController> & {
      selectionToolbarPreviewItems: { value: Array<{ key: string; title: string }> };
      onSelectionToolbarPreviewDragStart: (event: DragEvent, item: { key: string; title: string }) => void;
      onSelectionToolbarPreviewDrop: (index: number) => Promise<void>;
    };

    await controller.initialize();

    const emItem = controller.selectionToolbarPreviewItems.value.find(item => item.key === 'native:em');
    const dragTarget = document.createElement('button');
    document.body.appendChild(dragTarget);
    controller.onSelectionToolbarPreviewDragStart(createDragStartEvent(dragTarget), emItem!);
    await controller.onSelectionToolbarPreviewDrop(0);

    const persistedConfig = onChange.mock.calls.at(-1)?.[0];
    expect(persistedConfig?.selectionToolbarLayout.slice(0, 2)).toEqual([
      { type: 'native', id: 'em' },
      { type: 'native', id: 'strong' },
    ]);
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
