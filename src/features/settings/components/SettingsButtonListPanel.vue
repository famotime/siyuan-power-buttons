<template>
  <section>
    <div class="panel-title">
      <div>
        <h2>1. 按钮列表</h2>
        <p>{{ config.items.length }} 个按钮，拖拽可排序</p>
      </div>
      <div class="panel-title__actions">
        <button class="b3-button" @click="addItem">新建</button>
        <button class="b3-button b3-button--outline" :disabled="!selectedItem" @click="duplicateItem">复制</button>
      </div>
    </div>

    <div class="button-list">
      <div
        v-for="(item, index) in config.items"
        :key="item.id"
        class="button-list__item"
        :class="{ 'is-active': selectedId === item.id }"
        draggable="true"
        @dragstart="onListDragStart(index)"
        @dragover.prevent
        @drop="onListDrop(index)"
      >
        <button type="button" class="button-list__main" @click="selectItem(item.id)">
          <span class="button-list__drag">⋮⋮</span>
          <span class="button-list__icon" v-html="renderBuiltinIconMarkup(item)" />
          <span class="button-list__content">
            <strong>{{ item.title || '未命名按钮' }}</strong>
            <small>{{ surfaceLabel(item.surface) }}</small>
          </span>
        </button>
        <button
          type="button"
          class="switch-button switch-button--compact"
          :class="{ 'is-on': item.visible }"
          :title="item.visible ? '切换为隐藏' : '切换为显示'"
          :aria-label="item.visible ? '切换为隐藏' : '切换为显示'"
          @click.stop="toggleVisible(item.id)"
        >
          <span class="switch-button__dot" />
        </button>
        <button
          type="button"
          class="button-list__delete"
          title="删除按钮"
          aria-label="删除按钮"
          @click.stop="removeItem(item.id)"
        >
          <span v-html="TRASH_ICON" />
        </button>
      </div>
    </div>

    <section class="config-transfer">
      <div>
        <h3>配置文件</h3>
        <p>导入或导出左侧所有已配置按钮，不针对单个按钮。</p>
      </div>
      <div class="config-transfer__actions">
        <button class="b3-button b3-button--outline" type="button" @click="exportConfigFile">导出配置文件</button>
        <button class="b3-button b3-button--outline" type="button" @click="openImportFilePicker">导入配置文件</button>
      </div>
      <input
        :ref="importFileInput"
        class="config-transfer__input"
        type="file"
        accept=".json,application/json"
        @change="handleImportFile"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import type { Ref } from 'vue';
import type { PowerButtonItem, PowerButtonsConfig } from '@/shared/types';

defineProps<{
  config: PowerButtonsConfig;
  selectedId: string;
  selectedItem?: PowerButtonItem;
  importFileInput: Ref<HTMLInputElement | null>;
  renderBuiltinIconMarkup: (item: Pick<PowerButtonItem, 'iconType' | 'iconValue'>) => string;
  surfaceLabel: (value: string) => string;
  addItem: () => void | Promise<void>;
  duplicateItem: () => void | Promise<void>;
  selectItem: (itemId: string) => void;
  toggleVisible: (itemId: string) => void | Promise<void>;
  removeItem: (itemId: string) => void | Promise<void>;
  onListDragStart: (index: number) => void;
  onListDrop: (index: number) => void | Promise<void>;
  exportConfigFile: () => void;
  openImportFilePicker: () => void;
  handleImportFile: (event: Event) => void | Promise<void>;
}>();

const TRASH_ICON = `
  <svg class="siyuan-power-buttons__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zm1 6h2v8h-2zm4 0h2v8h-2zM7 9h2v8H7zm1 12a2 2 0 0 1-2-2V7h12v12a2 2 0 0 1-2 2z" />
  </svg>
`;
</script>
