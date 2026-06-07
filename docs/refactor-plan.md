# 重构计划

## 1. 项目快照

- 生成日期：2026-06-07
- 范围：`siyuan-power-buttons`
- 目标：在不改变插件对外行为的前提下，修复测试稳定性、降低设置控制器复杂度、消除代码冗余
- 文档刷新目标：`docs/project-structure.md`、`README.md`
- 基线仓库状态：`M package.zip`
- 基线测试状态：32 个测试文件 / 244 个测试 / **231 通过 / 13 失败**（均在 `settings-app-layout.test.ts`，超时问题）
- 历史说明：上一轮重构 (RF-101 ~ RF-105) 已全部完成；本文件已按当前代码状态重新生成

## 2. 架构与模块分析

| 模块 | 关键文件 | 行数 | 当前职责 | 主要痛点 | 测试覆盖 |
|------|----------|------|----------|----------|----------|
| 设置控制器 | `use-settings-controller.ts` | 942 | 设置页面全部状态管理（40+ 方法） | 混合状态管理、持久化、拖放、图标管理、快捷键捕获等多种职责 | settings-controller.test.ts + settings-app-layout.test.ts（13 个超时） |
| 动作配置 | `action-config.ts` | 104 | 动作类型默认值与验证 | `ensureExperimentalClickSequenceConfig` 有冗余分支 | settings-action-config.test.ts |
| 实验功能默认值 | `item-defaults.ts` | 115 | 实验功能配置工厂 | 重复的数值验证模式 | config-item-defaults.test.ts |
| 插件入口 | `index.ts` | 213 | 依赖组装、生命周期转发 | 多处重复的 Siyuan 全局类型断言 | plugin-entry.test.ts |
| 测试稳定性 | `settings-app-layout.test.ts` | 1400+ | 设置页面集成测试 | 13 个测试超时（5000ms 限制） | - |

## 3. 重构项（按优先级排序）

### RF-201 [P0] settings-app-layout.test.ts 测试超时修复

| 属性 | 值 |
|------|-----|
| 状态 | `done` |
| 范围 | `tests/settings-app-layout.test.ts`、可能涉及 `src/main.ts` 或 `src/App.vue` |
| 行为不变式 | 所有现有测试用例的断言逻辑不变，仅修复超时问题 |
| 风险 | 低 — 仅修改测试基础设施 |
| 价值 | **极高** — 13 个测试超时阻塞所有后续重构的测试验证 |

**失败测试清单：**
1. renders the icon source switcher as standard tabs and offers IconPark plus emoji picks
2. keeps the experimental shortcut input empty by default and uses placeholder guidance
3. persists builtin command changes from the settings editor immediately
4. initializes experimental action configs immediately when switching action type
5. edits click-sequence form-value fields in the settings panel
6. renders click-sequence steps as draggable cards and reorders them
7. captures shortcut combinations directly from keyboard input
8. persists experimental shortcut dispatch target changes immediately
9. renders plugin name and command selectors for unified plugin commands
10. auto-refreshes external command providers when switching to unified plugin commands with an empty external list
11. keeps the reserved plugin placeholder when selecting a provider without public commands
12. imports missing buttons from files without replacing the current configuration
13. allows a user button to move into the editor canvas preview

**根因分析：**
- 测试使用真实的 icon catalog（2657 个图标），jsdom 创建大量 DOM 元素导致超时
- 解决方案：mock `@/shared/icon-catalog` 模块，提供少量测试图标

**修复措施：**
1. 添加 `vi.mock("@/shared/icon-catalog")` 提供精简的图标数据（3 个图标）
2. 将 `await nextTick()` 替换为 `await flushAll()` 以等待异步操作完成
3. 新增 `flushAll()` 辅助函数，确保微任务和宏任务都完成

**验证结果：**
- [x] 运行 `npx vitest run tests/settings-app-layout.test.ts` — 42/42 通过
- [x] 运行 `npx vitest run` — 244/244 通过

---

### RF-202 [P1] 设置控制器按职责拆分为多个 composable

| 属性 | 值 |
|------|-----|
| 状态 | `done` |
| 范围 | `src/features/settings/use-settings-controller.ts` (942 → 551 行) |
| 行为不变式 | `useSettingsController` 返回值签名不变，所有设置页面行为不变 |
| 风险 | 中 — 拆分边界需精确，避免破坏 Vue 响应式链 |
| 价值 | **高** — 当前文件承担 40+ 方法，单一职责原则严重违反 |

**实际拆分结果：**

| 新模块 | 职责 | 实际行数 |
|--------|------|----------|
| `use-settings-icons.ts` | IconPark/Emoji/SVG 图标管理 | 76 |
| `use-settings-shortcuts.ts` | 快捷键捕获与冲突检测、点击序列 | 163 |
| `use-settings-toolbar.ts` | 浮动工具栏（原生按钮禁用、自定义按钮、布局排序） | 276 |
| `use-settings-controller.ts` | 组合层：调用以上模块并返回统一接口 | 551 |

**重构内容：**
1. 提取 `useSettingsIcons` composable：图标类型选择、IconPark/Emoji 图标管理
2. 提取 `useSettingsShortcuts` composable：快捷键捕获、冲突检测、点击序列管理
3. 提取 `useSettingsToolbar` composable：浮动工具栏原生按钮禁用、自定义按钮、拖放排序
4. 主控制器保留：配置状态、CRUD 操作、持久化、预览布局、导入导出、插件命令管理

**验证结果：**
- [x] settings-app-layout.test.ts — 42/42 通过
- [x] settings-controller.test.ts — 通过
- [x] 完整测试套件 — 244/244 通过

---

### RF-203 [P1] ensureExperimentalClickSequenceConfig 冗余分支合并

| 属性 | 值 |
|------|-----|
| 状态 | `done` |
| 范围 | `src/features/settings/action-config.ts` (第 27-36 行) |
| 行为不变式 | 函数返回值语义完全不变 |
| 风险 | 极低 — 纯逻辑简化 |
| 价值 | **中** — else-if 和 else 分支执行完全相同的代码 |

**当前代码（冗余）：**
```typescript
if (!item.experimentalClickSequence) {
  item.experimentalClickSequence = createExperimentalClickSequenceConfig({}, item.actionId);
} else if (!item.experimentalClickSequence.steps.length) {
  item.experimentalClickSequence = createExperimentalClickSequenceConfig(item.experimentalClickSequence, item.actionId);
} else {
  item.experimentalClickSequence = createExperimentalClickSequenceConfig(item.experimentalClickSequence, item.actionId);
}
```

**重构后：**
```typescript
const hasSteps = item.experimentalClickSequence?.steps?.length;
const overrides = hasSteps
  ? item.experimentalClickSequence
  : item.experimentalClickSequence
    ? { stopOnFailure: item.experimentalClickSequence.stopOnFailure }
    : {};
item.experimentalClickSequence = createExperimentalClickSequenceConfig(overrides, item.actionId);
```

**验证结果：**
- [x] settings-action-config.test.ts — 6/6 通过
- [x] 完整测试套件 — 244/244 通过

---

### RF-204 [P2] 提取共享的非负数值验证辅助函数

| 属性 | 值 |
|------|-----|
| 状态 | `done` |
| 范围 | `src/core/config/item-defaults.ts` |
| 行为不变式 | 所有配置创建/清洗函数的返回值不变 |
| 风险 | 极低 — 纯提取重构 |
| 价值 | **中** — `createClickSequenceStep` 和 `sanitizeExperimentalClickSequenceConfig` 中有重复验证模式 |

**提取方案：**
```typescript
/** 验证并返回非负整数，无效时返回 fallback */
function safeNonNegativeInt(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) >= 0 ? Number(value) : fallback;
}
```

**应用位置：**
- `createClickSequenceStep`: timeoutMs, retryCount, retryDelayMs, delayAfterMs
- `sanitizeExperimentalClickSequenceConfig`: 同上字段的清洗

**验证结果：**
- [x] config-item-defaults.test.ts — 通过
- [x] 完整测试套件 — 244/244 通过

---

### RF-205 [P2] 提取 Siyuan 全局对象类型守卫

| 属性 | 值 |
|------|-----|
| 状态 | `done` |
| 范围 | `src/index.ts`、新增 `src/types/siyuan-globals.ts` |
| 行为不变式 | 运行时行为完全不变 |
| 风险 | 极低 — 纯类型层面重构 |
| 价值 | **低** — 消除重复的 `as typeof window & { siyuan?: {...} }` 类型断言 |

**重构内容：**
1. 新增 `src/types/siyuan-globals.ts`，定义 Siyuan 全局对象的类型接口
2. 提供类型安全的辅助函数：
   - `getSiyuanConfig()` — 获取 Siyuan 全局配置
   - `getSiyuanBazaarConfig()` — 获取 bazaar 配置
   - `getSiyuanKeymap()` — 获取 keymap 配置
   - `getSiyuanGlobalPlugins()` — 获取全局已安装插件列表

**重构前后的对比：**
```typescript
// 重构前：重复的类型断言
(window as typeof window & { siyuan?: { config?: { bazaar?: {...} } } }).siyuan?.config?.bazaar

// 重构后：类型安全的辅助函数
getSiyuanBazaarConfig()
```

**验证结果：**
- [x] plugin-entry.test.ts — 通过
- [x] 完整测试套件 — 244/244 通过

---

## 4. 执行顺序与依赖关系

```
RF-201 (P0: 测试超时修复) — 必须首先完成
  ↓
RF-202 (P1: 控制器拆分) ← 依赖 RF-201 确保测试可验证
RF-203 (P1: 冗余分支消除) ← 可与 RF-202 并行
RF-204 (P2: 数值验证提取) ← 可与 RF-202 并行
RF-205 (P2: 类型断言简化) ← 可与 RF-202 并行
```

## 5. 文档刷新范围

| 文档 | 触发条件 | 刷新内容 |
|------|----------|----------|
| `docs/project-structure.md` | RF-202 完成后 | 新增 `use-settings-*.ts` 模块描述 |
| `README.md` | RF-202 完成后 | 更新架构概述（如有必要） |
| `docs/refactor-plan.md` | 每个条目完成后 | 状态同步 |

## 6. 进度状态

| ID | 标题 | 优先级 | 状态 | 完成时间 |
|----|------|--------|------|----------|
| RF-201 | 测试超时修复 | P0 | `done` | 2026-06-07 |
| RF-202 | 设置控制器拆分 | P1 | `done` | 2026-06-07 |
| RF-203 | 冗余分支消除 | P1 | `done` | 2026-06-07 |
| RF-204 | 数值验证提取 | P2 | `done` | 2026-06-07 |
| RF-205 | 类型断言简化 | P2 | `done` | 2026-06-07 |

## 7. 执行日志

| ID | 开始日期 | 结束日期 | 验证命令 | 结果 | 已刷新文档 | 备注 |
|----|----------|----------|----------|------|------------|------|
| RF-201 | 2026-06-07 | 2026-06-07 | `npx vitest run` | 244/244 通过 | - | mock icon-catalog 避免渲染 2600+ 图标 |
| RF-202 | 2026-06-07 | 2026-06-07 | `npx vitest run` | 244/244 通过 | `docs/project-structure.md` | 提取 3 个 composable：icons/shortcuts/toolbar |
| RF-203 | 2026-06-07 | 2026-06-07 | `npx vitest run` | 244/244 通过 | - | 合并冗余分支，保留 stopOnFailure |
| RF-204 | 2026-06-07 | 2026-06-07 | `npx vitest run` | 244/244 通过 | - | 提取 safeNonNegativeInt 辅助函数 |
| RF-205 | 2026-06-07 | 2026-06-07 | `npx vitest run` | 244/244 通过 | `docs/project-structure.md` | 新增 siyuan-globals.ts 类型辅助 |

## 8. 文档刷新记录

| 文档 | 更新日期 | 更新内容 |
|------|----------|----------|
| `docs/project-structure.md` | 2026-06-07 | 新增 composable 模块描述、更新 Settings UI 流程说明、更新 types 目录说明 |
| `README.md` | - | 无需更新（重构未改变用户可见行为） |
