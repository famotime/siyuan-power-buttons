<template>
  <div class="power-buttons-settings">
    <header class="settings-header">
      <div>
        <h1>思源快捷按钮</h1>
        <p>左侧管理按钮清单，预览区会自动读取当前界面布局；彩色按钮仅可在顶栏和底栏状态区间拖拽改位置，灰色原生按钮仅供查看。</p>
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
            <p>{{ config.items.length }} 个按钮，左侧可快速显隐，拖拽可排序</p>
          </div>
          <button class="b3-button b3-button--outline" :disabled="!selectedItem" @click="duplicateItem">复制</button>
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
                <strong>{{ item.title || "未命名按钮" }}</strong>
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

        <div class="surface-summary">
          <div class="surface-summary__header">
            <div>
              <h3>位置预览</h3>
              <p>灰色为原生按钮，半透明为隐藏态。拖拽彩色按钮图标可切换区域和顺序。</p>
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
                  @click="showPreviewLabels = !showPreviewLabels"
                >
                  <span class="switch-button__dot" />
                </button>
              </label>
              <button class="b3-button b3-button--outline" :disabled="isRefreshingLayout" @click="refreshCurrentLayout">
                {{ isRefreshingLayout ? "读取中..." : "读取当前布局" }}
              </button>
            </div>
          </div>

          <div class="workspace-preview" :class="{ 'show-labels': showPreviewLabels }">
            <div
              class="workspace-preview__topbar"
              @dragover.prevent
              @drop="onPreviewSurfaceDrop('topbar')"
            >
              <span class="workspace-preview__tag">顶栏</span>
              <div class="workspace-preview__stack workspace-preview__stack--row">
                <button
                  v-for="(item, index) in previewLayout.topbar"
                  :key="item.id"
                  type="button"
                  class="workspace-chip"
                  :class="previewChipClass(item)"
                  :draggable="item.editable"
                  :title="previewChipTitle(item)"
                  @click="handlePreviewChipClick(item)"
                  @dragstart="onPreviewDragStart(item)"
                  @dragover.prevent
                  @drop.stop="onPreviewItemDrop('topbar', previewLayout.topbar, index)"
                >
                  <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                  <span class="workspace-chip__label">{{ item.title }}</span>
                </button>
                <span v-if="!previewLayout.topbar.length" class="surface-summary__empty">空</span>
              </div>
            </div>

            <div class="workspace-preview__body">
              <div class="workspace-preview__dock">
                <span class="workspace-preview__tag">左 Dock</span>
                <div
                  class="workspace-preview__stack workspace-preview__segment"
                  @dragover.prevent
                  @drop="onPreviewSurfaceDrop('dock-left-top')"
                >
                  <button
                    v-for="(item, index) in previewLayout.leftDockTop"
                    :key="item.id"
                    type="button"
                    class="workspace-chip"
                    :class="previewChipClass(item)"
                    :draggable="item.editable"
                    :title="previewChipTitle(item)"
                    @click="handlePreviewChipClick(item)"
                    @dragstart="onPreviewDragStart(item)"
                    @dragover.prevent
                    @drop.stop="onPreviewItemDrop('dock-left-top', previewLayout.leftDockTop, index)"
                  >
                    <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                    <span class="workspace-chip__label">{{ item.title }}</span>
                  </button>
                  <span v-if="!previewLayout.leftDockTop.length" class="surface-summary__empty">空</span>
                </div>
                <div
                  class="workspace-preview__stack workspace-preview__segment workspace-preview__segment--end"
                  @dragover.prevent
                  @drop="onPreviewSurfaceDrop('dock-left-bottom')"
                >
                  <button
                    v-for="(item, index) in previewLayout.leftDockBottom"
                    :key="item.id"
                    type="button"
                    class="workspace-chip"
                    :class="previewChipClass(item)"
                    :draggable="item.editable"
                    :title="previewChipTitle(item)"
                    @click="handlePreviewChipClick(item)"
                    @dragstart="onPreviewDragStart(item)"
                    @dragover.prevent
                    @drop.stop="onPreviewItemDrop('dock-left-bottom', previewLayout.leftDockBottom, index)"
                  >
                    <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                    <span class="workspace-chip__label">{{ item.title }}</span>
                  </button>
                  <span v-if="!previewLayout.leftDockBottom.length" class="surface-summary__empty">空</span>
                </div>
              </div>

              <div class="workspace-preview__canvas">
                <div class="workspace-preview__canvas-note">编辑区</div>
                <div class="workspace-preview__bottom-dock">
                  <div
                    class="workspace-preview__stack workspace-preview__stack--row"
                    @dragover.prevent
                    @drop="onPreviewSurfaceDrop('dock-bottom-left')"
                  >
                    <button
                      v-for="(item, index) in previewLayout.bottomDockLeft"
                      :key="item.id"
                      type="button"
                      class="workspace-chip"
                      :class="previewChipClass(item)"
                      :draggable="item.editable"
                      :title="previewChipTitle(item)"
                      @click="handlePreviewChipClick(item)"
                      @dragstart="onPreviewDragStart(item)"
                      @dragover.prevent
                      @drop.stop="onPreviewItemDrop('dock-bottom-left', previewLayout.bottomDockLeft, index)"
                    >
                      <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                      <span class="workspace-chip__label">{{ item.title }}</span>
                    </button>
                  </div>
                  <div
                    class="workspace-preview__stack workspace-preview__stack--row"
                    @dragover.prevent
                    @drop="onPreviewSurfaceDrop('dock-bottom-right')"
                  >
                    <button
                      v-for="(item, index) in previewLayout.bottomDockRight"
                      :key="item.id"
                      type="button"
                      class="workspace-chip"
                      :class="previewChipClass(item)"
                      :draggable="item.editable"
                      :title="previewChipTitle(item)"
                      @click="handlePreviewChipClick(item)"
                      @dragstart="onPreviewDragStart(item)"
                      @dragover.prevent
                      @drop.stop="onPreviewItemDrop('dock-bottom-right', previewLayout.bottomDockRight, index)"
                    >
                      <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                      <span class="workspace-chip__label">{{ item.title }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="workspace-preview__dock">
                <span class="workspace-preview__tag">右 Dock</span>
                <div
                  class="workspace-preview__stack workspace-preview__segment"
                  @dragover.prevent
                  @drop="onPreviewSurfaceDrop('dock-right-top')"
                >
                  <button
                    v-for="(item, index) in previewLayout.rightDockTop"
                    :key="item.id"
                    type="button"
                    class="workspace-chip"
                    :class="previewChipClass(item)"
                    :draggable="item.editable"
                    :title="previewChipTitle(item)"
                    @click="handlePreviewChipClick(item)"
                    @dragstart="onPreviewDragStart(item)"
                    @dragover.prevent
                    @drop.stop="onPreviewItemDrop('dock-right-top', previewLayout.rightDockTop, index)"
                  >
                    <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                    <span class="workspace-chip__label">{{ item.title }}</span>
                  </button>
                  <span v-if="!previewLayout.rightDockTop.length" class="surface-summary__empty">空</span>
                </div>
                <div
                  class="workspace-preview__stack workspace-preview__segment workspace-preview__segment--end"
                  @dragover.prevent
                  @drop="onPreviewSurfaceDrop('dock-right-bottom')"
                >
                  <button
                    v-for="(item, index) in previewLayout.rightDockBottom"
                    :key="item.id"
                    type="button"
                    class="workspace-chip"
                    :class="previewChipClass(item)"
                    :draggable="item.editable"
                    :title="previewChipTitle(item)"
                    @click="handlePreviewChipClick(item)"
                    @dragstart="onPreviewDragStart(item)"
                    @dragover.prevent
                    @drop.stop="onPreviewItemDrop('dock-right-bottom', previewLayout.rightDockBottom, index)"
                  >
                    <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                    <span class="workspace-chip__label">{{ item.title }}</span>
                  </button>
                  <span v-if="!previewLayout.rightDockBottom.length" class="surface-summary__empty">空</span>
                </div>
              </div>
            </div>

            <div class="workspace-preview__statusbar">
              <div
                class="workspace-preview__stack workspace-preview__stack--row"
                @dragover.prevent
                @drop="onPreviewSurfaceDrop('statusbar-left')"
              >
                <span class="workspace-preview__tag">状态栏左侧</span>
                <button
                  v-for="(item, index) in previewLayout.statusbarLeft"
                  :key="item.id"
                  type="button"
                  class="workspace-chip"
                  :class="previewChipClass(item)"
                  :draggable="item.editable"
                  :title="previewChipTitle(item)"
                  @click="handlePreviewChipClick(item)"
                  @dragstart="onPreviewDragStart(item)"
                  @dragover.prevent
                  @drop.stop="onPreviewItemDrop('statusbar-left', previewLayout.statusbarLeft, index)"
                >
                  <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                  <span class="workspace-chip__label">{{ item.title }}</span>
                </button>
                <span v-if="!previewLayout.statusbarLeft.length" class="surface-summary__empty">空</span>
              </div>
              <div
                class="workspace-preview__stack workspace-preview__stack--row workspace-preview__stack--right"
                @dragover.prevent
                @drop="onPreviewSurfaceDrop('statusbar-right')"
              >
                <button
                  v-for="(item, index) in previewLayout.statusbarRight"
                  :key="item.id"
                  type="button"
                  class="workspace-chip"
                  :class="previewChipClass(item)"
                  :draggable="item.editable"
                  :title="previewChipTitle(item)"
                  @click="handlePreviewChipClick(item)"
                  @dragstart="onPreviewDragStart(item)"
                  @dragover.prevent
                  @drop.stop="onPreviewItemDrop('statusbar-right', previewLayout.statusbarRight, index)"
                >
                  <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                  <span class="workspace-chip__label">{{ item.title }}</span>
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
                <button
                  type="button"
                  class="switch-button"
                  :class="{ 'is-on': selectedItem.visible }"
                  :title="selectedItem.visible ? '切换为隐藏' : '切换为显示'"
                  :aria-label="selectedItem.visible ? '切换为隐藏' : '切换为显示'"
                  @click="toggleVisible(selectedItem.id)"
                >
                  <span class="switch-button__dot" />
                </button>
              </label>
            </div>
          </section>

          <section class="editor-card">
            <div class="editor-card__title">实验功能</div>
            <div class="form-grid">
              <label class="form-switch">
                <span>快捷键适配</span>
                <button
                  type="button"
                  class="switch-button"
                  :class="{ 'is-on': config.experimental.shortcutAdapter }"
                  :title="config.experimental.shortcutAdapter ? '关闭实验快捷键适配' : '开启实验快捷键适配'"
                  :aria-label="config.experimental.shortcutAdapter ? '关闭实验快捷键适配' : '开启实验快捷键适配'"
                  @click="toggleExperimentalFlag('shortcutAdapter')"
                >
                  <span class="switch-button__dot" />
                </button>
              </label>
              <label class="form-switch">
                <span>点击序列适配</span>
                <button
                  type="button"
                  class="switch-button"
                  :class="{ 'is-on': config.experimental.clickSequenceAdapter }"
                  title="为后续实验点击序列预留，目前尚未实现"
                  aria-label="为后续实验点击序列预留，目前尚未实现"
                  @click="toggleExperimentalFlag('clickSequenceAdapter')"
                >
                  <span class="switch-button__dot" />
                </button>
              </label>
              <div class="form-grid__full">
                <small>实验能力默认关闭。快捷键适配依赖当前焦点和思源版本，失败时会自动回退并提示。</small>
              </div>
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

              <template v-else-if="selectedItem.actionType === 'experimental-shortcut'">
                <label>
                  <span>快捷键</span>
                  <input
                    v-model="selectedItem.experimentalShortcut!.shortcut"
                    class="b3-text-field"
                    placeholder="例如：Ctrl+B / Alt+5"
                    @change="syncExperimentalShortcut"
                  />
                </label>
                <label>
                  <span>派发目标</span>
                  <select v-model="selectedItem.experimentalShortcut!.dispatchTarget" class="b3-select" @change="syncExperimentalShortcut">
                    <option value="auto">自动</option>
                    <option value="active-editor">活动编辑器</option>
                    <option value="body">页面主体</option>
                    <option value="window">窗口</option>
                  </select>
                </label>
                <label class="form-switch">
                  <span>先发 Escape</span>
                  <button
                    type="button"
                    class="switch-button"
                    :class="{ 'is-on': selectedItem.experimentalShortcut!.sendEscapeBefore }"
                    :title="selectedItem.experimentalShortcut!.sendEscapeBefore ? '关闭预先发送 Escape' : '开启预先发送 Escape'"
                    :aria-label="selectedItem.experimentalShortcut!.sendEscapeBefore ? '关闭预先发送 Escape' : '开启预先发送 Escape'"
                    @click="toggleSelectedShortcutOption('sendEscapeBefore')"
                  >
                    <span class="switch-button__dot" />
                  </button>
                </label>
                <label class="form-switch">
                  <span>允许直接发到 window</span>
                  <button
                    type="button"
                    class="switch-button"
                    :class="{ 'is-on': selectedItem.experimentalShortcut!.allowDirectWindowDispatch }"
                    :title="selectedItem.experimentalShortcut!.allowDirectWindowDispatch ? '关闭 window 直接派发' : '开启 window 直接派发'"
                    :aria-label="selectedItem.experimentalShortcut!.allowDirectWindowDispatch ? '关闭 window 直接派发' : '开启 window 直接派发'"
                    @click="toggleSelectedShortcutOption('allowDirectWindowDispatch')"
                  >
                    <span class="switch-button__dot" />
                  </button>
                </label>
                <div class="form-grid__full">
                  <small v-if="!config.experimental.shortcutAdapter">实验快捷键适配当前未启用。即使保存按钮，运行时也会提示未启用或无法执行。</small>
                  <small v-else>会优先按思源 keymap 反查命令，再决定回退到稳定命令执行或模拟按键。</small>
                </div>
              </template>

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
import {
  computed,
  onMounted,
  reactive,
  ref,
} from "vue";
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
  buildPreviewLayout,
  movePreviewItem,
} from "@/shared/preview-layout";
import {
  ACTION_TYPES,
  CONFIGURABLE_SURFACES,
  ICON_TYPES,
} from "@/shared/types";
import {
  cloneConfig,
  moveItem,
  normalizeItemOrder,
} from "@/shared/utils";
import type {
  BuiltinCommandDefinition,
  PluginCommandDefinition,
  ExperimentalShortcutConfig,
  PowerButtonItem,
  PowerButtonsConfig,
  PreviewButtonItem,
  SurfaceType,
} from "@/shared/types";

const TRASH_ICON = `
  <svg class="siyuan-power-buttons__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zm1 6h2v8h-2zm4 0h2v8h-2zM7 9h2v8H7zm1 12a2 2 0 0 1-2-2V7h12v12a2 2 0 0 1-2 2z" />
  </svg>
`;

const props = withDefaults(defineProps<{
  initialConfig: PowerButtonsConfig;
  builtinCommands?: BuiltinCommandDefinition[];
  pluginCommands?: PluginCommandDefinition[];
  onChange: (config: PowerButtonsConfig) => void | Promise<void>;
  onNotify: (message: string, type?: "info" | "error") => void;
  onReadCurrentLayout?: () => PreviewButtonItem[] | Promise<PreviewButtonItem[]>;
}>(), {
  builtinCommands: () => BUILTIN_COMMANDS,
  pluginCommands: () => PLUGIN_COMMANDS,
  onReadCurrentLayout: () => [],
});

const config = reactive<PowerButtonsConfig>(cloneConfig(props.initialConfig));
const selectedId = ref(config.items[0]?.id || "");
const listDragIndex = ref<number | null>(null);
const previewDragId = ref<string>("");
const runtimePreviewItems = ref<PreviewButtonItem[]>([]);
const isRefreshingLayout = ref(false);
const showPreviewLabels = ref(false);
const jsonBuffer = ref("");
const iconKeyword = ref("");

const surfaces = CONFIGURABLE_SURFACES.map(value => ({
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

const configPreviewItems = computed<PreviewButtonItem[]>(() => {
  return config.items.map(item => ({
    id: item.id,
    itemId: item.id,
    title: item.title || "未命名按钮",
    visible: item.visible,
    surface: item.surface,
    order: item.order + 1000,
    editable: true,
    source: "config",
    iconMarkup: renderBuiltinIconMarkup(item),
  }));
});

const previewLayout = computed(() => {
  return buildPreviewLayout([...runtimePreviewItems.value, ...configPreviewItems.value], { includeHidden: true });
});

const filteredBuiltinIcons = computed(() => {
  const result = filterBuiltinIcons(iconKeyword.value);
  return result.length ? result : BUILTIN_ICON_OPTIONS;
});

function selectItem(id: string): void {
  selectedId.value = id;
}

async function refreshCurrentLayout(): Promise<void> {
  if (!props.onReadCurrentLayout || isRefreshingLayout.value) {
    return;
  }
  isRefreshingLayout.value = true;
  try {
    runtimePreviewItems.value = await props.onReadCurrentLayout();
  } catch (error) {
    props.onNotify(error instanceof Error ? error.message : String(error), "error");
  } finally {
    isRefreshingLayout.value = false;
  }
}

async function persist(): Promise<void> {
  config.items = normalizeItemOrder(config.items);
  await props.onChange(cloneConfig(config));
  await refreshCurrentLayout();
}

function addItem(): void {
  const item = createButtonItem({
    title: `按钮 ${config.items.length + 1}`,
    order: config.items.length,
  });
  config.items.push(item);
  selectedId.value = item.id;
  void persist();
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
  void persist();
}

function removeItem(itemId: string): void {
  const target = config.items.find(item => item.id === itemId);
  if (!target) {
    return;
  }
  const shouldRemove = window.confirm(`确定删除按钮「${target.title || "未命名按钮"}」吗？`);
  if (!shouldRemove) {
    return;
  }
  const index = config.items.findIndex(item => item.id === itemId);
  config.items.splice(index, 1);
  if (selectedId.value === itemId) {
    selectedId.value = config.items[0]?.id || "";
  }
  void persist();
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
  void persist();
}

function toggleVisible(itemId: string): void {
  const target = config.items.find(item => item.id === itemId);
  if (!target) {
    return;
  }
  target.visible = !target.visible;
  void persist();
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
  } else if (selectedItem.value.actionType === "experimental-shortcut") {
    selectedItem.value.actionId = selectedItem.value.experimentalShortcut?.shortcut || "Ctrl+B";
    selectedItem.value.experimentalShortcut = ensureExperimentalShortcut(selectedItem.value);
  } else {
    selectedItem.value.actionId = "https://example.com";
  }
  void persist();
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
  void persist();
}

function selectBuiltinIcon(value: string): void {
  if (!selectedItem.value) {
    return;
  }
  selectedItem.value.iconType = "builtin";
  selectedItem.value.iconValue = value;
  void persist();
}

function ensureExperimentalShortcut(item: PowerButtonItem): ExperimentalShortcutConfig {
  if (!item.experimentalShortcut) {
    item.experimentalShortcut = {
      shortcut: item.actionId || "Ctrl+B",
      sendEscapeBefore: false,
      dispatchTarget: "auto",
      allowDirectWindowDispatch: false,
    };
  }
  return item.experimentalShortcut;
}

function syncExperimentalShortcut(): void {
  if (!selectedItem.value) {
    return;
  }
  const config = ensureExperimentalShortcut(selectedItem.value);
  selectedItem.value.actionId = config.shortcut || "Ctrl+B";
  void persist();
}

function toggleSelectedShortcutOption(key: "sendEscapeBefore" | "allowDirectWindowDispatch"): void {
  if (!selectedItem.value) {
    return;
  }
  const config = ensureExperimentalShortcut(selectedItem.value);
  config[key] = !config[key];
  selectedItem.value.actionId = config.shortcut || "Ctrl+B";
  void persist();
}

function toggleExperimentalFlag(key: "shortcutAdapter" | "clickSequenceAdapter"): void {
  config.experimental[key] = !config.experimental[key];
  void persist();
}

function onListDragStart(index: number): void {
  listDragIndex.value = index;
}

function onListDrop(index: number): void {
  if (listDragIndex.value === null || listDragIndex.value === index) {
    return;
  }
  config.items = normalizeItemOrder(moveItem(config.items, listDragIndex.value, index));
  listDragIndex.value = null;
  void persist();
}

function onPreviewDragStart(item: PreviewButtonItem): void {
  if (!item.editable || !item.itemId) {
    return;
  }
  previewDragId.value = item.itemId;
}

function getPreviewInsertIndex(surfaceItems: PreviewButtonItem[], targetIndex: number): number {
  return surfaceItems.slice(0, targetIndex).filter(item => item.editable).length;
}

function moveFromPreview(surface: SurfaceType, targetIndex: number): void {
  if (!previewDragId.value) {
    return;
  }
  if (!CONFIGURABLE_SURFACES.includes(surface as typeof CONFIGURABLE_SURFACES[number])) {
    props.onNotify("Dock 区域当前仅保留预览，不能放置快捷按钮。", "error");
    previewDragId.value = "";
    return;
  }
  config.items = movePreviewItem(config.items, previewDragId.value, surface, targetIndex);
  selectedId.value = previewDragId.value;
  previewDragId.value = "";
  void persist();
}

function onPreviewItemDrop(surface: SurfaceType, surfaceItems: PreviewButtonItem[], targetIndex: number): void {
  moveFromPreview(surface, getPreviewInsertIndex(surfaceItems, targetIndex));
}

function onPreviewSurfaceDrop(surface: SurfaceType): void {
  moveFromPreview(surface, config.items.filter(item => item.surface === surface).length);
}

function handlePreviewChipClick(item: PreviewButtonItem): void {
  if (!item.editable || !item.itemId) {
    props.onNotify("原生按钮当前仅支持读取预览，暂不可直接编辑。");
    return;
  }
  selectItem(item.itemId);
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
    void persist();
    props.onNotify("配置已导入。");
  } catch (error) {
    props.onNotify(error instanceof Error ? error.message : String(error), "error");
  }
}

function renderNamedIcon(iconName: string): string {
  return `<svg class="siyuan-power-buttons__icon" aria-hidden="true"><use xlink:href="#${iconName}"></use></svg>`;
}

function renderBuiltinIconMarkup(item: Pick<PowerButtonItem, "iconType" | "iconValue">): string {
  if (item.iconType === "emoji") {
    return `<span class="emoji-icon">${item.iconValue || "⚡"}</span>`;
  }
  if (item.iconType === "svg") {
    return item.iconValue || renderNamedIcon(DEFAULT_BUILTIN_ICON);
  }
  return renderNamedIcon(item.iconValue || DEFAULT_BUILTIN_ICON);
}

function previewIconMarkup(item: PreviewButtonItem): string {
  return item.iconMarkup || renderNamedIcon(DEFAULT_BUILTIN_ICON);
}

function previewChipClass(item: PreviewButtonItem): Record<string, boolean> {
  return {
    "is-active": item.itemId === selectedId.value,
    "is-native": !item.editable,
    "is-hidden": item.editable && !item.visible,
    "is-draggable": item.editable,
  };
}

function previewChipTitle(item: PreviewButtonItem): string {
  if (!item.editable) {
    return `${item.title} · 原生按钮，仅预览`;
  }
  return `${item.title} · ${item.visible ? "显示中" : "隐藏中"} · 可拖拽调整`;
}

function surfaceLabel(value: string): string {
  return SURFACE_LABELS[value];
}

function actionTypeLabel(value: string): string {
  return ACTION_TYPE_LABELS[value];
}

onMounted(() => {
  void refreshCurrentLayout();
});
</script>
