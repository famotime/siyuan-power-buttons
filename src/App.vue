<template>
  <div class="power-buttons-settings">
    <header class="settings-header">
      <div>
        <h1>思源快捷按钮</h1>
        <p>左侧管理按钮清单，预览区会自动读取当前界面布局；彩色按钮可拖到顶栏、状态栏和编辑区调整位置，灰色原生按钮仅供查看。</p>
      </div>
      <div class="settings-header__actions">
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
                <p>灰色为原生按钮，半透明为隐藏态。拖拽彩色按钮图标可切换区域和顺序；编辑区按钮会按保存位置参与运行时渲染。</p>
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
                <div class="workspace-preview__canvas-header">
                  <div class="workspace-preview__canvas-note">编辑区</div>
                  <div
                    class="workspace-preview__stack workspace-preview__stack--row workspace-preview__canvas-items"
                    @dragover.prevent
                    @drop="onPreviewSurfaceDrop('canvas')"
                  >
                    <button
                      v-for="(item, index) in previewLayout.canvas"
                      :key="item.id"
                      type="button"
                      class="workspace-chip"
                      :class="previewChipClass(item)"
                      :draggable="item.editable"
                      :title="previewChipTitle(item)"
                      @click="handlePreviewChipClick(item)"
                      @dragstart="onPreviewDragStart(item)"
                      @dragover.prevent
                      @drop.stop="onPreviewItemDrop('canvas', previewLayout.canvas, index)"
                    >
                      <span class="workspace-chip__icon" v-html="previewIconMarkup(item)" />
                      <span class="workspace-chip__label">{{ item.title }}</span>
                    </button>
                    <span v-if="!previewLayout.canvas.length" class="surface-summary__empty">空</span>
                  </div>
                </div>
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
            ref="importFileInput"
            class="config-transfer__input"
            type="file"
            accept=".json,application/json"
            @change="handleImportFile"
          />
        </section>
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

              <template v-else-if="selectedItem.actionType === 'experimental-shortcut'">
                <label>
                  <span>快捷键</span>
                  <input
                    :value="selectedItem.experimentalShortcut!.shortcut"
                    class="b3-text-field shortcut-capture__input"
                    :class="{ 'is-conflict': Boolean(activeShortcutMessage) }"
                    placeholder="例如：Ctrl+B / Alt+5"
                    readonly
                    @focus="shortcutCaptureError = ''"
                    @keydown="captureSelectedShortcut"
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
                  <small>聚焦输入框后直接按组合键；按 Backspace / Delete 可清空当前快捷键。</small>
                  <small v-if="activeShortcutMessage" class="form-hint form-hint--error">{{ activeShortcutMessage }}</small>
                  <small v-if="!config.experimental.shortcutAdapter">实验快捷键适配当前未启用。即使保存按钮，运行时也会提示未启用或无法执行。</small>
                  <small v-else>会优先按思源 keymap 反查命令，再决定回退到稳定命令执行或模拟按键。</small>
                </div>
              </template>

              <template v-else-if="selectedItem.actionType === 'experimental-click-sequence'">
                <div class="form-grid__full click-sequence-editor">
                  <div class="click-sequence-editor__header">
                    <span>点击步骤</span>
                    <button class="b3-button b3-button--outline" type="button" @click="addClickSequenceStep">新增步骤</button>
                  </div>

                  <div
                    v-for="(step, index) in selectedItem.experimentalClickSequence!.steps"
                    :key="`${selectedItem.id}-step-${index}`"
                    class="click-sequence-step"
                  >
                    <div class="click-sequence-step__title">
                      <strong>步骤 {{ index + 1 }}</strong>
                      <button
                        class="b3-button b3-button--outline"
                        type="button"
                        :disabled="selectedItem.experimentalClickSequence!.steps.length <= 1"
                        @click="removeClickSequenceStep(index)"
                      >
                        删除
                      </button>
                    </div>
                    <div class="form-grid">
                      <label class="form-grid__full">
                        <span>选择器</span>
                        <input
                          v-model="step.selector"
                          class="b3-text-field"
                          placeholder="例如：barSettings / text:复制块引用 / .b3-menu__item"
                          @change="syncExperimentalClickSequence"
                        />
                      </label>
                      <label>
                        <span>等待超时(ms)</span>
                        <input v-model.number="step.timeoutMs" class="b3-text-field" type="number" min="0" step="100" @change="syncExperimentalClickSequence" />
                      </label>
                      <label>
                        <span>重试次数</span>
                        <input v-model.number="step.retryCount" class="b3-text-field" type="number" min="0" step="1" @change="syncExperimentalClickSequence" />
                      </label>
                      <label>
                        <span>重试间隔(ms)</span>
                        <input v-model.number="step.retryDelayMs" class="b3-text-field" type="number" min="0" step="50" @change="syncExperimentalClickSequence" />
                      </label>
                      <label>
                        <span>步骤后延迟(ms)</span>
                        <input v-model.number="step.delayAfterMs" class="b3-text-field" type="number" min="0" step="50" @change="syncExperimentalClickSequence" />
                      </label>
                    </div>
                  </div>
                </div>
                <label class="form-switch">
                  <span>失败即停止</span>
                  <button
                    type="button"
                    class="switch-button"
                    :class="{ 'is-on': selectedItem.experimentalClickSequence!.stopOnFailure }"
                    :title="selectedItem.experimentalClickSequence!.stopOnFailure ? '关闭失败即停止' : '开启失败即停止'"
                    :aria-label="selectedItem.experimentalClickSequence!.stopOnFailure ? '关闭失败即停止' : '开启失败即停止'"
                    @click="toggleSelectedClickSequenceStopOnFailure"
                  >
                    <span class="switch-button__dot" />
                  </button>
                </label>
                <div class="form-grid__full">
                  <small v-if="!config.experimental.clickSequenceAdapter">实验点击序列当前未启用。保存配置后，运行时仍会被拦截并提示。</small>
                  <small v-else>支持简单标识符、`text:` 文本匹配和原始 CSS 选择器。失败提示会标出具体步骤。</small>
                </div>
              </template>

            </div>
          </section>

          <section class="editor-card">
            <div class="editor-card__title">图标设置</div>
            <div class="icon-tabs" role="tablist" aria-label="图标类型">
              <button
                v-for="iconType in iconTypes"
                :key="iconType.value"
                :id="iconTypeTabId(iconType.value)"
                type="button"
                role="tab"
                class="icon-tabs__tab"
                :class="{ 'is-active': selectedItem.iconType === iconType.value }"
                :tabindex="selectedItem.iconType === iconType.value ? 0 : -1"
                :aria-selected="selectedItem.iconType === iconType.value"
                :aria-controls="iconTypePanelId"
                @click="selectIconType(iconType.value)"
              >
                {{ iconType.label }}
              </button>
            </div>

            <div
              :id="iconTypePanelId"
              class="icon-tabs__panel"
              role="tabpanel"
              :aria-labelledby="iconTypeTabId(selectedItem.iconType)"
            >
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

              <template v-else-if="selectedItem.iconType === 'emoji'">
                <label class="icon-editor">
                  <span>自定义 Emoji</span>
                  <input v-model="selectedItem.iconValue" class="b3-text-field" placeholder="例如：⚡" @change="persist" />
                </label>

                <div class="emoji-grid">
                  <button
                    v-for="emoji in commonEmojiOptions"
                    :key="emoji"
                    type="button"
                    class="emoji-grid__item"
                    :class="{ 'is-active': selectedItem.iconValue === emoji }"
                    :title="`使用 ${emoji}`"
                    @click="selectEmojiIcon(emoji)"
                  >
                    <span class="emoji-grid__preview">{{ emoji }}</span>
                  </button>
                </div>
              </template>

              <template v-else>
                <label class="icon-editor">
                  <span>SVG 内容或图标 id</span>
                  <textarea v-model="selectedItem.iconValue" class="b3-text-field" rows="5" @change="persist" />
                </label>
              </template>
            </div>
          </section>

        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
} from "vue";
import {
  BUILTIN_COMMANDS,
  PLUGIN_COMMANDS,
} from "@/core/commands";
import type { SettingsAppProps } from "@/features/settings/types";
import { useSettingsController } from "@/features/settings/use-settings-controller";

const TRASH_ICON = `
  <svg class="siyuan-power-buttons__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zm1 6h2v8h-2zm4 0h2v8h-2zM7 9h2v8H7zm1 12a2 2 0 0 1-2-2V7h12v12a2 2 0 0 1-2 2z" />
  </svg>
`;

const props = withDefaults(defineProps<SettingsAppProps>(), {
  builtinCommands: () => BUILTIN_COMMANDS,
  pluginCommands: () => PLUGIN_COMMANDS,
  onReadCurrentLayout: () => [],
});

const {
  actionTypes,
  activeShortcutMessage,
  addClickSequenceStep,
  addItem,
  applyActionDefaults,
  builtinCommands,
  captureSelectedShortcut,
  commonEmojiOptions,
  config,
  duplicateItem,
  exportConfigFile,
  filteredBuiltinIcons,
  handleImportFile,
  handlePreviewChipClick,
  iconKeyword,
  iconTypes,
  importFileInput,
  initialize,
  isRefreshingLayout,
  onListDragStart,
  onListDrop,
  onPreviewDragStart,
  onPreviewItemDrop,
  onPreviewSurfaceDrop,
  openImportFilePicker,
  pluginCommands,
  previewChipClass,
  previewChipTitle,
  previewIconMarkup,
  previewLayout,
  removeClickSequenceStep,
  removeItem,
  renderNamedIcon,
  renderBuiltinIconMarkup,
  resetConfig,
  selectedId,
  selectedItem,
  selectItem,
  selectBuiltinIcon,
  selectEmojiIcon,
  selectIconType,
  showPreviewLabels,
  surfaceLabel,
  surfaces,
  syncExperimentalClickSequence,
  toggleSelectedClickSequenceStopOnFailure,
  toggleSelectedShortcutOption,
  toggleVisible,
} = useSettingsController(props);

const iconTypeTabId = (iconType: string) => `icon-type-tab-${iconType}`;
const iconTypePanelId = "icon-type-panel";

onMounted(() => {
  void initialize();
});
</script>
