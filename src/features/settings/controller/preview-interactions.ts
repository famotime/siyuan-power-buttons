import type { Ref } from 'vue';
import { triggerElementBySmartSelectors } from '@/core/commands';
import { movePreviewItem } from '@/shared/preview-layout';
import { CONFIGURABLE_SURFACES } from '@/shared/types';
import type {
  DisabledNativeButton,
  PowerButtonsConfig,
  PreviewButtonItem,
  SurfaceType,
} from '@/shared/types';

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

  async function moveFromPreview(surface: SurfaceType, targetIndex: number): Promise<void> {
    const dragItem = options.previewDragItem.value;
    if (!dragItem) {
      return;
    }

    if (!dragItem.editable || !dragItem.itemId) {
      if (dragItem.suppressed) {
        if (dragItem.surface !== surface) {
          options.notify('原生按钮只能拖回原来的区域以恢复显示。');
          options.previewDragItem.value = null;
          clearPreviewDragImage(options.previewDragCleanup);
          return;
        }
        options.config.disabledNativeButtons = options.config.disabledNativeButtons.filter(
          item => !isSameNativeButton(dragItem, item),
        );
        options.previewDragItem.value = null;
        clearPreviewDragImage(options.previewDragCleanup);
        await options.persist();
        return;
      }

      options.notify('原生按钮只能拖到禁用栏。');
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    if (!CONFIGURABLE_SURFACES.includes(surface as typeof CONFIGURABLE_SURFACES[number])) {
      options.notify('Dock 区域当前仅保留预览，不能放置快捷按钮。', 'error');
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

  async function onPreviewSurfaceDrop(surface: SurfaceType): Promise<void> {
    await moveFromPreview(surface, options.config.items.filter(item => item.surface === surface).length);
  }

  async function onDisabledNativeDrop(): Promise<void> {
    const dragItem = options.previewDragItem.value;
    if (!dragItem) {
      return;
    }

    if (dragItem.editable) {
      options.notify('禁用栏仅用于隐藏原生按钮；自定义按钮请使用显示开关。');
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    if (dragItem.suppressed || !dragItem.nativeSelectors?.length) {
      options.previewDragItem.value = null;
      clearPreviewDragImage(options.previewDragCleanup);
      return;
    }

    const selectors = normalizeSelectors(dragItem.nativeSelectors);
    const nextRule: DisabledNativeButton = {
      id: dragItem.id,
      title: dragItem.title,
      surface: dragItem.surface,
      selectors,
      iconMarkup: dragItem.iconMarkup,
    };

    options.config.disabledNativeButtons = [
      ...options.config.disabledNativeButtons.filter(item => !isSameNativeButton(dragItem, item)),
      nextRule,
    ];
    options.previewDragItem.value = null;
    clearPreviewDragImage(options.previewDragCleanup);
    await options.persist();
  }

  async function restoreDisabledNativeItem(item: PreviewButtonItem): Promise<void> {
    options.config.disabledNativeButtons = options.config.disabledNativeButtons.filter(
      entry => !isSameNativeButton(item, entry),
    );
    await options.persist();
  }

  function handlePreviewChipClick(item: PreviewButtonItem): void {
    if (!item.editable || !item.itemId) {
      if (item.suppressed) {
        options.notify('该原生按钮已禁用；拖回原区域即可恢复显示。');
        return;
      }
      if (item.nativeSelectors?.length && triggerElementBySmartSelectors(item.nativeSelectors, document)) {
        return;
      }
      options.notify('原生按钮当前仅支持读取预览，暂不可直接编辑。');
      return;
    }
    options.selectedId.value = item.itemId;
  }

  return {
    handlePreviewChipClick,
    onDisabledNativeDrop,
    onPreviewDragStart,
    onPreviewItemDrop,
    onPreviewSurfaceDrop,
    restoreDisabledNativeItem,
  };
}
