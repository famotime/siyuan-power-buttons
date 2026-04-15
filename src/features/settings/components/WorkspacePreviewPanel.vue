<template>
  <div class="surface-summary">
    <div class="surface-summary__header">
      <div>
        <h3>位置预览</h3>
        <p>灰色为原生按钮，半透明为隐藏态。彩色按钮可拖动调整区域和顺序；原生按钮可拖到禁用栏后直接隐藏并禁用入口。</p>
      </div>
      <div class="surface-summary__controls">
        <label class="surface-summary__toggle">
          <span>显示文字</span>
          <button
            type="button"
            class="switch-button switch-button--icon-only"
            :class="{ 'is-on': showPreviewLabels }"
            title="切换预览中的按钮文字显示"
            aria-label="切换预览中的按钮文字显示"
            @click="togglePreviewLabels"
          >
            <span class="switch-button__dot" />
          </button>
        </label>
        <button class="b3-button b3-button--outline" :disabled="isRefreshingLayout" @click="refreshCurrentLayout">
          {{ isRefreshingLayout ? '读取中...' : '读取当前布局' }}
        </button>
      </div>
    </div>

    <div class="workspace-preview" :class="{ 'show-labels': showPreviewLabels }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showPreviewLabels: boolean;
  isRefreshingLayout: boolean;
  togglePreviewLabels: () => void;
  refreshCurrentLayout: () => void | Promise<void>;
}>();
</script>
