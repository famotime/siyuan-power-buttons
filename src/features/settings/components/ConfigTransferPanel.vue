<template>
  <section class="config-transfer">
    <div>
      <h3>配置文件</h3>
      <p>导入或导出所有已配置按钮</p>
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
</template>

<script setup lang="ts">
import type { Ref } from 'vue';

defineProps<{
  importFileInput: Ref<HTMLInputElement | null>;
  exportConfigFile: () => void;
  openImportFilePicker: () => void;
  handleImportFile: (event: Event) => void | Promise<void>;
}>();
</script>
