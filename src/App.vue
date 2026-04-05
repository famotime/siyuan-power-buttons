<template>
  <div class="power-buttons-settings">
    <header class="settings-header">
      <div>
        <h1>思源快捷按钮</h1>
        <p>先在左侧选按钮，再在右侧修改位置、动作和图标。所有改动会自动保存。</p>
      </div>
      <div class="settings-header__actions">
        <button class="b3-button" @click="addItem">新建按钮</button>
        <button class="b3-button b3-button--outline" @click="resetConfig">恢复默认</button>
      </div>
    </header>

    <div class="settings-layout">
      <aside class="settings-panel settings-panel--sidebar">
        <div class="panel-title">
          <div>
            <h2>1. 按钮列表</h2>
            <p>{{ config.items.length }} 个按钮，拖拽可排序</p>
          </div>
          <button class="b3-button b3-button--outline" :disabled="!selectedItem" @click="duplicateItem">复制</button>
        </div>

        <div class="button-list">
          <button
            v-for="(item, index) in config.items"
            :key="item.id"
            type="button"
            class="button-list__item"
            :class="{ 'is-active': selectedId === item.id }"
            draggable="true"
            @click="selectItem(item.id)"
            @dragstart="onDragStart(index)"
            @dragover.prevent
            @drop="onDrop(index)"
          >
            <span class="button-list__drag">⋮⋮</span>
            <span class="button-list__icon" v-html="renderBuiltinIconMarkup(item)" />
            <span class="button-list__content">
              <strong>{{ item.title || "未命名按钮" }}</strong>
              <small>{{ surfaceLabel(item.surface) }}</small>
            </span>
            <span class="button-list__state" :class="{ 'is-off': !item.visible }">
              {{ item.visible ? "显示" : "隐藏" }}
            </span>
          </button>
        </div>

        <div class="surface-summary">
          <h3>位置预览</h3>
          <div class="workspace-preview">
            <div class="workspace-preview__topbar">
              <span class="workspace-preview__tag">顶栏</span>
              <div class="workspace-preview__stack workspace-preview__stack--row">
                <button
                  v-for="item in previewLayout.topbar"
                  :key="item.id"
                  type="button"
                  class="workspace-chip"
                  :class="{ 'is-active': selectedId === item.id }"
                  @click="selectItem(item.id)"
                >
                  {{ item.title }}
                </button>
                <span v-if="!previewLayout.topbar.length" class="surface-summary__empty">空</span>
              </div>
            </div>

            <div class="workspace-preview__body">
              <div class="workspace-preview__dock">
                <span class="workspace-preview__tag">左 Dock</span>
                <div class="workspace-preview__stack">
                  <button
                    v-for="item in previewLayout.leftDockTop"
                    :key="item.id"
                    type="button"
                    class="workspace-chip"
                    :class="{ 'is-active': selectedId === item.id }"
                    @click="selectItem(item.id)"
                  >
                    {{ item.title }}
                  </button>
                  <button
                    v-for="item in previewLayout.leftDockBottom"
                    :key="item.id"
                    type="button"
                    class="workspace-chip workspace-chip--muted"
                    :class="{ 'is-active': selectedId === item.id }"
                    @click="selectItem(item.id)"
                  >
                    {{ item.title }}
                  </button>
                </div>
              </div>

              <div class="workspace-preview__canvas">
                <div class="workspace-preview__canvas-note">编辑区</div>
                <div class="workspace-preview__bottom-dock">
                  <div class="workspace-preview__stack workspace-preview__stack--row">
                    <button
                      v-for="item in previewLayout.bottomDockLeft"
                      :key="item.id"
                      type="button"
                      class="workspace-chip"
                      :class="{ 'is-active': selectedId === item.id }"
                      @click="selectItem(item.id)"
                    >
                      {{ item.title }}
                    </button>
                  </div>
                  <div class="workspace-preview__stack workspace-preview__stack--row">
                    <button
                      v-for="item in previewLayout.bottomDockRight"
                      :key="item.id"
                      type="button"
                      class="workspace-chip"
                      :class="{ 'is-active': selectedId === item.id }"
                      @click="selectItem(item.id)"
                    >
                      {{ item.title }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="workspace-preview__dock">
                <span class="workspace-preview__tag">右 Dock</span>
                <div class="workspace-preview__stack">
                  <button
                    v-for="item in previewLayout.rightDockTop"
                    :key="item.id"
                    type="button"
                    class="workspace-chip"
                    :class="{ 'is-active': selectedId === item.id }"
                    @click="selectItem(item.id)"
                  >
                    {{ item.title }}
                  </button>
                  <button
                    v-for="item in previewLayout.rightDockBottom"
                    :key="item.id"
                    type="button"
                    class="workspace-chip workspace-chip--muted"
                    :class="{ 'is-active': selectedId === item.id }"
                    @click="selectItem(item.id)"
                  >
                    {{ item.title }}
                  </button>
                </div>
              </div>
            </div>

            <div class="workspace-preview__statusbar">
              <div class="workspace-preview__stack workspace-preview__stack--row">
                <span class="workspace-preview__tag">状态栏左侧</span>
                <button
                  v-for="item in previewLayout.statusbarLeft"
                  :key="item.id"
                  type="button"
                  class="workspace-chip"
                  :class="{ 'is-active': selectedId === item.id }"
                  @click="selectItem(item.id)"
                >
                  {{ item.title }}
                </button>
                <span v-if="!previewLayout.statusbarLeft.length" class="surface-summary__empty">空</span>
              </div>
              <div class="workspace-preview__stack workspace-preview__stack--row workspace-preview__stack--right">
                <button
                  v-for="item in previewLayout.statusbarRight"
                  :key="item.id"
                  type="button"
                  class="workspace-chip"
                  :class="{ 'is-active': selectedId === item.id }"
                  @click="selectItem(item.id)"
                >
                  {{ item.title }}
                </button>
                <span v-if="!previewLayout.statusbarRight.length" class="surface-summary__empty">空</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="settings-panel settings-panel--editor">
        <div class="panel-title">
          <div>
            <h2>2. 按钮设置</h2>
            <p v-if="selectedItem">当前正在编辑：{{ selectedItem.title || "未命名按钮" }}</p>
            <p v-else>请先在左侧选中一个按钮</p>
          </div>
          <button class="b3-button b3-button--outline" :disabled="!selectedItem" @click="removeItem">删除</button>
        </div>

        <template v-if="selectedItem">
          <section class="editor-card editor-card--preview">
            <div class="editor-card__title">当前预览</div>
            <div class="preview-card">
              <div class="preview-card__icon" v-html="renderBuiltinIconMarkup(selectedItem)" />
              <div class="preview-card__meta">
                <strong>{{ selectedItem.title || "未命名按钮" }}</strong>
                <span>{{ surfaceLabel(selectedItem.surface) }} · {{ actionTypeLabel(selectedItem.actionType) }}</span>
              </div>
            </div>
          </section>

          <section class="editor-card">
            <div class="editor-card__title">基本信息</div>
            <div class="form-grid">
              <label>
                <span>按钮名称</span>
                <input v-model="selectedItem.title" class="b3-text-field" placeholder="例如：全局搜索" @change="persist" />
              </label>
              <label>
                <span>提示文字</span>
                <input v-model="selectedItem.tooltip" class="b3-text-field" placeholder="鼠标悬停提示" @change="persist" />
              </label>
              <label>
                <span>显示位置</span>
                <select v-model="selectedItem.surface" class="b3-select" @change="persist">
                  <option v-for="surface in surfaces" :key="surface.value" :value="surface.value">{{ surface.label }}</option>
                </select>
              </label>
              <label class="form-switch">
                <span>显示状态</span>
                <button type="button" class="switch-button" :class="{ 'is-on': selectedItem.visible }" @click="toggleVisible">
                  {{ selectedItem.visible ? "已显示" : "已隐藏" }}
                </button>
              </label>
            </div>
          </section>

          <section class="editor-card">
            <div class="editor-card__title">动作设置</div>
            <div class="form-grid">
              <label>
                <span>动作类型</span>
                <select v-model="selectedItem.actionType" class="b3-select" @change="applyActionDefaults">
                  <option v-for="action in actionTypes" :key="action.value" :value="action.value">{{ action.label }}</option>
                </select>
              </label>

              <label v-if="selectedItem.actionType === 'builtin-global-command'">
                <span>内置命令</span>
                <select v-model="selectedItem.actionId" class="b3-select" @change="persist">
                  <option v-for="command in builtinCommands" :key="command.id" :value="command.id">
                    {{ command.category }} · {{ command.title }}
                  </option>
                </select>
              </label>

              <label v-else-if="selectedItem.actionType === 'plugin-command'">
                <span>插件命令</span>
                <select v-model="selectedItem.actionId" class="b3-select" @change="persist">
                  <option v-for="command in pluginCommands" :key="command.id" :value="command.id">
                    {{ command.title }}
                  </option>
                </select>
              </label>

              <label v-else-if="selectedItem.actionType === 'custom-action'">
                <span>插件动作</span>
                <select v-model="selectedItem.actionId" class="b3-select" @change="persist">
                  <option v-for="action in customActions" :key="action.id" :value="action.id">{{ action.title }}</option>
                </select>
              </label>

              <label v-else>
                <span>目标链接</span>
                <input v-model="selectedItem.actionId" class="b3-text-field" placeholder="https://example.com" @change="persist" />
              </label>
            </div>
          </section>

          <section class="editor-card">
            <div class="editor-card__title">图标设置</div>
            <div class="form-grid">
              <label>
                <span>图标来源</span>
                <select v-model="selectedItem.iconType" class="b3-select" @change="applyIconDefaults">
                  <option v-for="iconType in iconTypes" :key="iconType.value" :value="iconType.value">{{ iconType.label }}</option>
                </select>
              </label>
              <label v-if="selectedItem.iconType === 'emoji'">
                <span>Emoji</span>
                <input v-model="selectedItem.iconValue" class="b3-text-field" placeholder="例如：⚡" @change="persist" />
              </label>
              <label v-else-if="selectedItem.iconType === 'svg'" class="form-grid__full">
                <span>SVG 内容或图标 id</span>
                <textarea v-model="selectedItem.iconValue" class="b3-text-field" rows="5" @change="persist" />
              </label>
            </div>

            <template v-if="selectedItem.iconType === 'builtin'">
              <label class="icon-search">
                <span>搜索内置图标</span>
                <input v-model="iconKeyword" class="b3-text-field" placeholder="输入名称，例如：搜索 / 设置 / search" />
              </label>

              <div class="icon-grid">
                <button
                  v-for="icon in filteredBuiltinIcons"
                  :key="icon.value"
                  type="button"
                  class="icon-grid__item"
                  :class="{ 'is-active': selectedItem.iconValue === icon.value }"
                  :title="`${icon.label} (${icon.value})`"
                  @click="selectBuiltinIcon(icon.value)"
                >
                  <span class="icon-grid__preview" v-html="renderNamedIcon(icon.value)" />
                  <span class="icon-grid__label">{{ icon.label }}</span>
                  <small>{{ icon.value }}</small>
                </button>
              </div>
            </template>
          </section>

          <details class="editor-card editor-card--compact">
            <summary>导入 / 导出配置</summary>
            <div class="json-tools">
              <div class="json-tools__actions">
                <button class="b3-button b3-button--outline" @click="loadExportJson">导出到文本框</button>
                <button class="b3-button b3-button--outline" @click="copyJson">复制 JSON</button>
                <button class="b3-button b3-button--outline" @click="applyImportJson">从文本框导入</button>
              </div>
              <textarea
                v-model="jsonBuffer"
                class="b3-text-field json-tools__textarea"
                rows="8"
                placeholder="导出的配置会显示在这里；也可以把 JSON 粘贴到这里后点击导入。"
              />
            </div>
          </details>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import {
  createButtonItem,
  createDefaultConfig,
  exportConfigAsJson,
  importConfigFromJson,
} from "@/core/config";
import {
  BUILTIN_COMMANDS,
  PLUGIN_COMMANDS,
} from "@/core/commands";
import {
  BUILTIN_ICON_OPTIONS,
  filterBuiltinIcons,
} from "@/shared/icon-catalog";
import {
  ACTION_TYPE_LABELS,
  CUSTOM_ACTIONS,
  DEFAULT_BUILTIN_ICON,
  SURFACE_LABELS,
} from "@/shared/constants";
import {
  ACTION_TYPES,
  ICON_TYPES,
  SURFACES,
} from "@/shared/types";
import {
  cloneConfig,
  moveItem,
  normalizeItemOrder,
} from "@/shared/utils";
import { buildPreviewLayout } from "@/shared/preview-layout";
import type {
  BuiltinCommandDefinition,
  PluginCommandDefinition,
  PowerButtonItem,
  PowerButtonsConfig,
} from "@/shared/types";

const props = withDefaults(defineProps<{
  initialConfig: PowerButtonsConfig;
  builtinCommands?: BuiltinCommandDefinition[];
  pluginCommands?: PluginCommandDefinition[];
  onChange: (config: PowerButtonsConfig) => void | Promise<void>;
  onNotify: (message: string, type?: "info" | "error") => void;
}>(), {
  builtinCommands: () => BUILTIN_COMMANDS,
  pluginCommands: () => PLUGIN_COMMANDS,
});

const config = reactive<PowerButtonsConfig>(cloneConfig(props.initialConfig));
const selectedId = ref(config.items[0]?.id || "");
const dragIndex = ref<number | null>(null);
const jsonBuffer = ref("");
const iconKeyword = ref("");

const surfaces = SURFACES.map(value => ({
  value,
  label: SURFACE_LABELS[value],
}));

const actionTypes = ACTION_TYPES.map(value => ({
  value,
  label: ACTION_TYPE_LABELS[value],
}));

const iconTypes = ICON_TYPES.map(value => ({
  value,
  label: value === "builtin" ? "内置图标" : value === "emoji" ? "Emoji" : "SVG",
}));

const builtinCommands = computed(() => props.builtinCommands);
const pluginCommands = computed(() => props.pluginCommands);
const customActions = CUSTOM_ACTIONS;

const selectedItem = computed<PowerButtonItem | undefined>(() => config.items.find(item => item.id === selectedId.value));

const previewLayout = computed(() => buildPreviewLayout(config.items));

const filteredBuiltinIcons = computed(() => {
  const result = filterBuiltinIcons(iconKeyword.value);
  return result.length ? result : BUILTIN_ICON_OPTIONS;
});

function selectItem(id: string): void {
  selectedId.value = id;
}

function persist(): void {
  config.items = normalizeItemOrder(config.items);
  void props.onChange(cloneConfig(config));
}

function addItem(): void {
  const item = createButtonItem({
    title: `按钮 ${config.items.length + 1}`,
    order: config.items.length,
  });
  config.items.push(item);
  selectedId.value = item.id;
  persist();
}

function duplicateItem(): void {
  if (!selectedItem.value) {
    return;
  }
  const item = createButtonItem({
    ...selectedItem.value,
    id: undefined,
    title: `${selectedItem.value.title} 副本`,
    order: config.items.length,
  });
  config.items.push(item);
  selectedId.value = item.id;
  persist();
}

function removeItem(): void {
  if (!selectedItem.value) {
    return;
  }
  const shouldRemove = window.confirm(`确定删除按钮「${selectedItem.value.title || "未命名按钮"}」吗？`);
  if (!shouldRemove) {
    return;
  }
  const index = config.items.findIndex(item => item.id === selectedItem.value?.id);
  config.items.splice(index, 1);
  selectedId.value = config.items[0]?.id || "";
  persist();
}

function resetConfig(): void {
  if (!window.confirm("确定恢复默认按钮配置吗？")) {
    return;
  }
  const nextConfig = createDefaultConfig();
  config.items = nextConfig.items;
  config.desktopOnly = nextConfig.desktopOnly;
  config.experimental = nextConfig.experimental;
  selectedId.value = config.items[0]?.id || "";
  persist();
}

function toggleVisible(): void {
  if (!selectedItem.value) {
    return;
  }
  selectedItem.value.visible = !selectedItem.value.visible;
  persist();
}

function applyActionDefaults(): void {
  if (!selectedItem.value) {
    return;
  }

  if (selectedItem.value.actionType === "builtin-global-command") {
    selectedItem.value.actionId = builtinCommands.value[0]?.id || "globalSearch";
  } else if (selectedItem.value.actionType === "plugin-command") {
    selectedItem.value.actionId = pluginCommands.value[0]?.id || "open-settings";
  } else if (selectedItem.value.actionType === "custom-action") {
    selectedItem.value.actionId = customActions[0]?.id || "open-settings";
  } else {
    selectedItem.value.actionId = "https://example.com";
  }
  persist();
}

function applyIconDefaults(): void {
  if (!selectedItem.value) {
    return;
  }
  if (selectedItem.value.iconType === "builtin") {
    selectedItem.value.iconValue = DEFAULT_BUILTIN_ICON;
  } else if (selectedItem.value.iconType === "emoji") {
    selectedItem.value.iconValue = "⚡";
  } else {
    selectedItem.value.iconValue = `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`;
  }
  persist();
}

function selectBuiltinIcon(value: string): void {
  if (!selectedItem.value) {
    return;
  }
  selectedItem.value.iconType = "builtin";
  selectedItem.value.iconValue = value;
  persist();
}

function onDragStart(index: number): void {
  dragIndex.value = index;
}

function onDrop(index: number): void {
  if (dragIndex.value === null || dragIndex.value === index) {
    return;
  }
  config.items = normalizeItemOrder(moveItem(config.items, dragIndex.value, index));
  dragIndex.value = null;
  persist();
}

function loadExportJson(): void {
  jsonBuffer.value = exportConfigAsJson(cloneConfig(config));
}

async function copyJson(): Promise<void> {
  const serialized = exportConfigAsJson(cloneConfig(config));
  jsonBuffer.value = serialized;
  try {
    await navigator.clipboard.writeText(serialized);
    props.onNotify("配置 JSON 已复制到剪贴板。");
  } catch {
    props.onNotify("复制失败，请从文本框手动复制。", "error");
  }
}

function applyImportJson(): void {
  try {
    const imported = importConfigFromJson(jsonBuffer.value);
    config.items = imported.items;
    config.desktopOnly = imported.desktopOnly;
    config.experimental = imported.experimental;
    selectedId.value = config.items[0]?.id || "";
    persist();
    props.onNotify("配置已导入。");
  } catch (error) {
    props.onNotify(error instanceof Error ? error.message : String(error), "error");
  }
}

function renderNamedIcon(iconName: string): string {
  return `<svg class="siyuan-power-buttons__icon" aria-hidden="true"><use xlink:href="#${iconName}"></use></svg>`;
}

function renderBuiltinIconMarkup(item: PowerButtonItem): string {
  if (item.iconType === "emoji") {
    return `<span class="emoji-icon">${item.iconValue || "⚡"}</span>`;
  }
  if (item.iconType === "svg") {
    return item.iconValue || renderNamedIcon(DEFAULT_BUILTIN_ICON);
  }
  return renderNamedIcon(item.iconValue || DEFAULT_BUILTIN_ICON);
}

function surfaceLabel(value: string): string {
  return SURFACE_LABELS[value];
}

function actionTypeLabel(value: string): string {
  return ACTION_TYPE_LABELS[value];
}
</script>
