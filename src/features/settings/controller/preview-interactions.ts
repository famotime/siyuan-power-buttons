import type { Ref } from 'vue';
import { fetchSyncPost } from 'siyuan';
import { movePreviewItem } from '@/shared/preview-layout';
import { isDockSurface } from '@/shared/surface-metadata';
import { CONFIGURABLE_SURFACES } from '@/shared/types';
import type {
  DisabledNativeButton,
  PowerButtonsConfig,
  PreviewButtonItem,
  SurfaceType,
} from '@/shared/types';

function parseDockSurface(surface: SurfaceType): { dockKey: 'left' | 'right' | 'bottom'; groupIndex: number } | null {
  switch (surface) {
    case 'dock-left-top':
      return { dockKey: 'left', groupIndex: 0 };
    case 'dock-left-bottom':
      return { dockKey: 'left', groupIndex: 1 };
    case 'dock-right-top':
      return { dockKey: 'right', groupIndex: 0 };
    case 'dock-right-bottom':
      return { dockKey: 'right', groupIndex: 1 };
    case 'dock-bottom-left':
      return { dockKey: 'bottom', groupIndex: 0 };
    case 'dock-bottom-right':
      return { dockKey: 'bottom', groupIndex: 1 };
    default:
      return null;
  }
}

function getDockTabType(dragItem: PreviewButtonItem): string | null {
  if (dragItem.nativeSelectors?.length) {
    for (const selector of dragItem.nativeSelectors) {
      const match = selector.match(/^\[data-type="([^"]+)"\]$/) || selector.match(/^data-type:(.+)$/);
      if (match) return match[1];
      if (!selector.startsWith('#') && !selector.startsWith('.') && !selector.startsWith('[')) {
        return selector;
      }
    }
  }

  const parts = dragItem.id.split(':');
  if (parts.length >= 3 && parts[0] === 'native') {
    return parts.slice(2).join(':');
  }

  return null;
}

function getPreviewInsertIndex(surfaceItems: PreviewButtonItem[], targetIndex: number): number {
  return surfaceItems.slice(0, targetIndex).filter(item => item.editable).length;
}

function normalizeSelectors(selectors: string[] | undefined): string[] {
  return Array.from(new Set((selectors || []).map(selector => selector.trim()).filter(Boolean)));
}

export function isSameNativeButton(
  item: Pick<PreviewButtonItem, 'id' | 'surface' | 'nativeSelectors'>,
  suppressed: Pick<DisabledNativeButton, 'id' | 'surface' | 'selectors'>,
): boolean {
  if (item.id === suppressed.id) {
    return true;
  }

  if (item.surface !== suppressed.surface) {
    return false;
  }

  const itemSelectors = normalizeSelectors(item.nativeSelectors);
  const suppressedSelectors = normalizeSelectors(suppressed.selectors);

  return itemSelectors.some(selector => suppressedSelectors.includes(selector));
}

function clearPreviewDragImage(previewDragCleanup: Ref<(() => void) | null>): void {
  previewDragCleanup.value?.();
  previewDragCleanup.value = null;
}

function configurePreviewDragImage(
  event: DragEvent,
  previewDragCleanup: Ref<(() => void) | null>,
): void {
  if (!event.dataTransfer || typeof event.dataTransfer.setDragImage !== 'function') {
    return;
  }

  const source = event.currentTarget;
  if (!(source instanceof HTMLElement)) {
    return;
  }

  clearPreviewDragImage(previewDragCleanup);

  const dragImage = source.cloneNode(true);
  if (!(dragImage instanceof HTMLElement)) {
    return;
  }

  dragImage.style.position = 'fixed';
  dragImage.style.top = '-10000px';
  dragImage.style.left = '-10000px';
  dragImage.style.pointerEvents = 'none';
  dragImage.style.margin = '0';
  dragImage.style.transform = 'none';
  dragImage.style.width = `${Math.ceil(source.getBoundingClientRect().width || source.offsetWidth || 32)}px`;
  dragImage.classList.add('workspace-chip--drag-image');
  document.body.appendChild(dragImage);

  const cleanup = () => {
    dragImage.remove();
  };
  previewDragCleanup.value = cleanup;
  window.setTimeout(() => {
    if (previewDragCleanup.value === cleanup) {
      clearPreviewDragImage(previewDragCleanup);
    }
  }, 0);

  const rect = source.getBoundingClientRect();
  event.dataTransfer.setDragImage(
    dragImage,
    Math.max(0, Math.round(rect.width / 2)),
    Math.max(0, Math.round(rect.height / 2)),
  );
}

export function usePreviewInteractions(options: {
  config: PowerButtonsConfig;
  selectedId: Ref<string>;
  previewDragItem: Ref<PreviewButtonItem | null>;
  previewDragCleanup: Ref<(() => void) | null>;
  persist: () => Promise<void>;
  notify: (message: string, type?: 'info' | 'error') => void;
}) {
  function onPreviewDragStart(event: DragEvent, item: PreviewButtonItem): void {
    if (!item.draggable && !item.editable) {
      return;
    }
    options.previewDragItem.value = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', item.itemId || item.id);
    }
    configurePreviewDragImage(event, options.previewDragCleanup);
  }

  async function moveNativeDockItem(
    dragItem: PreviewButtonItem,
    targetSurface: SurfaceType,
    targetIndex: number,
  ): Promise<void> {
    const uiLayout = (window as any).siyuan?.config?.uiLayout;
    if (!uiLayout) {
      options.notify('无法读取思源布局配置，重排失败。', 'error');
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    const tabType = getDockTabType(dragItem);
    if (!tabType) {
      options.notify('无法识别该 Dock 按钮类型，重排失败。', 'error');
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    const targetParsed = parseDockSurface(targetSurface);
    if (!targetParsed) {
      options.notify('无效的 Dock 目标区域。', 'error');
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    const clonedLayout = JSON.parse(JSON.stringify(uiLayout));
    let removedTab: any = null;

    for (const key of ['left', 'right', 'bottom'] as const) {
      if (!clonedLayout[key]?.data || !Array.isArray(clonedLayout[key].data)) continue;
      for (let g = 0; g < clonedLayout[key].data.length; g++) {
        const group = clonedLayout[key].data[g];
        if (!Array.isArray(group)) continue;
        const idx = group.findIndex((tab: any) => tab?.type === tabType || tab?.type === dragItem.id);
        if (idx !== -1) {
          removedTab = group.splice(idx, 1)[0];
          break;
        }
      }
      if (removedTab) break;
    }

    if (!removedTab) {
      removedTab = {
        type: tabType,
        title: dragItem.title,
      };
    }

    const { dockKey, groupIndex } = targetParsed;
    if (!clonedLayout[dockKey]) {
      clonedLayout[dockKey] = { data: [[], []] };
    }
    if (!Array.isArray(clonedLayout[dockKey].data)) {
      clonedLayout[dockKey].data = [[], []];
    }
    while (clonedLayout[dockKey].data.length <= groupIndex) {
      clonedLayout[dockKey].data.push([]);
    }
    if (!Array.isArray(clonedLayout[dockKey].data[groupIndex])) {
      clonedLayout[dockKey].data[groupIndex] = [];
    }

    const targetGroup = clonedLayout[dockKey].data[groupIndex];
    const insertIdx = Math.min(Math.max(0, targetIndex), targetGroup.length);
    targetGroup.splice(insertIdx, 0, removedTab);

    try {
      const response = await fetchSyncPost('/api/system/setUILayout', {
        layout: clonedLayout,
      });

      if (response?.code === 0) {
        if ((window as any).siyuan?.config) {
          (window as any).siyuan.config.uiLayout = clonedLayout;
        }
        options.notify(`已成功调整「${dragItem.title}」在 Dock 区域的位置。`);
        await options.persist();
      } else {
        options.notify(response?.msg || '更新思源 Dock 布局失败。', 'error');
      }
    } catch (err) {
      options.notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
    }
  }

  async function moveFromPreview(surface: SurfaceType, targetIndex: number): Promise<void> {
    const dragItem = options.previewDragItem.value;
    if (!dragItem) {
      return;
    }

    console.log('[PowerButtons] dragItem in moveFromPreview:', {
      id: dragItem.id,
      itemId: dragItem.itemId,
      title: dragItem.title,
      editable: dragItem.editable,
      source: dragItem.source,
      surface: dragItem.surface,
    });

    if (!dragItem.editable || !dragItem.itemId) {
      if (isDockSurface(dragItem.surface) && isDockSurface(surface)) {
        await moveNativeDockItem(dragItem, surface, targetIndex);
        return;
      }

      if (dragItem.surface === surface) {
        options.previewDragItem.value = null;
        clearPreviewDragImage(options.previewDragCleanup);
        return;
      }

      options.notify('非自定义按钮无法跨类型拖拽，仅支持在 Dock 区域内重排或点击启用/禁用。');
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    if (!CONFIGURABLE_SURFACES.includes(surface as typeof CONFIGURABLE_SURFACES[number])) {
      options.notify('无效的显示区域。', 'error');
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    options.config.items = movePreviewItem(options.config.items, dragItem.itemId, surface, targetIndex);
    options.selectedId.value = dragItem.itemId;
    options.previewDragItem.value = null;
    clearPreviewDragImage(options.previewDragCleanup);
    await options.persist();
  }

  async function onPreviewItemDrop(
    surface: SurfaceType,
    surfaceItems: PreviewButtonItem[],
    targetIndex: number,
  ): Promise<void> {
    await moveFromPreview(surface, getPreviewInsertIndex(surfaceItems, targetIndex));
  }

  async function onPreviewSurfaceDrop(surface: SurfaceType, targetIndex?: number): Promise<void> {
    await moveFromPreview(
      surface,
      targetIndex ?? options.config.items.filter(item => item.surface === surface).length,
    );
  }

  async function toggleNativeButtonDisabled(item: PreviewButtonItem): Promise<void> {
    if (item.suppressed) {
      // 恢复：从禁用列表中移除
      options.config.disabledNativeButtons = options.config.disabledNativeButtons.filter(
        entry => !isSameNativeButton(item, entry),
      );
    } else if (item.nativeSelectors?.length) {
      // 禁用：添加到禁用列表
      const selectors = normalizeSelectors(item.nativeSelectors);
      const nextRule: DisabledNativeButton = {
        id: item.id,
        title: item.title,
        surface: item.surface,
        selectors,
        iconMarkup: item.iconMarkup,
      };
      options.config.disabledNativeButtons = [
        ...options.config.disabledNativeButtons.filter(entry => !isSameNativeButton(item, entry)),
        nextRule,
      ];
    } else {
      return;
    }
    await options.persist();
  }

  function handlePreviewChipClick(item: PreviewButtonItem): void {
    if (!item.editable || !item.itemId) {
      // 原生按钮：点击切换禁用/恢复，与浮动工具栏逻辑一致
      toggleNativeButtonDisabled(item);
      return;
    }
    options.selectedId.value = item.itemId;
  }

  return {
    handlePreviewChipClick,
    onPreviewDragStart,
    onPreviewItemDrop,
    onPreviewSurfaceDrop,
  };
}
