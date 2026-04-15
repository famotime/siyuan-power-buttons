# 重构计划

## 1. 项目快照

- 生成日期：2026-04-15
- 范围：`siyuan-power-buttons`
- 目标：在不改变插件对外行为的前提下，继续降低设置页、运行时入口、Surface 渲染和配置规则的耦合度，并把当前缺少覆盖的高风险路径补成可重复执行的自动化测试。
- 文档刷新目标：`docs/project-structure.md`、`README.md`
- 基线仓库状态：`git status --short` 为空，工作区干净
- 基线测试状态：`npm test` 通过，`24` 个测试文件 / `148` 个测试全部通过
- 历史说明：仓库中原有的 `docs/refactor-plan.md` 记录的是 2026-04-06 已完成的一轮重构；本文件已按当前代码状态重新生成，用于本轮审批

## 2. 架构与模块分析

| 模块 | 关键文件 | 当前职责 | 主要痛点 | 测试覆盖情况 |
| --- | --- | --- | --- | --- |
| 入口与运行时装配 | `src/index.ts`、`src/core/runtime/plugin-runtime.ts`、`src/core/runtime/settings-dialog-controller.ts` | 拉取应用版本、装配 `ConfigStore` / `CommandExecutor` / `ExternalCommandRegistry` / `SurfaceManager`、注册插件命令、打开设置页 | `src/index.ts` 仍承担大量依赖装配和实验能力闭包；`plugin-runtime.ts` 既处理 provider 刷新又处理设置页 props 生成和命令注册，入口边界仍偏厚 | `tests/plugin-runtime.test.ts` 覆盖运行时主路径；缺少对 `src/index.ts` 依赖装配层的更细粒度断言 |
| 设置页 UI 与状态编排 | `src/App.vue`、`src/features/settings/use-settings-controller.ts`、`src/features/settings/action-config.ts`、`src/features/settings/view-helpers.ts` | 按钮列表、拖拽排序、预览布局、实验动作编辑、图标选择、导入导出、原生按钮禁用/恢复 | `src/App.vue` 约 `789` 行，`use-settings-controller.ts` 约 `769` 行；状态、拖拽、副作用、文件导入导出、原生按钮抑制逻辑集中在单个 controller 中，主要依赖大颗粒挂载测试兜底 | `tests/settings-app-layout.test.ts` 和 `tests/settings-action-config.test.ts` 覆盖较多 UI 路径，但缺少 controller 层测试；“恢复默认”路径当前没有专门回归测试 |
| 配置规则与动作默认值 | `src/core/config/sanitize.ts`、`src/core/config/item-defaults.ts`、`src/core/config/defaults.ts`、`src/features/settings/action-config.ts` | 创建默认按钮、导入清洗、实验快捷键/点击序列默认值、设置页动作切换时的默认回填 | 默认值规则分散在 config 层和 settings 层，实验动作的 hydration / summarize / fallback 规则跨模块维护；后续改 schema 时容易出现界面态与持久化态不一致 | `tests/config-store.test.ts`、`tests/import-export.test.ts`、`tests/config-item-defaults.test.ts`、`tests/settings-action-config.test.ts` 覆盖主路径，但缺少“设置页恢复默认 -> sanitize -> 持久化”一体化断言 |
| Surface 渲染与原生按钮抑制 | `src/core/surfaces/surface-manager.ts`、`src/core/surfaces/native-element-suppressor.ts`、`src/shared/surface-metadata.ts`、`src/shared/runtime-snapshot.ts` | 顶栏/状态栏/编辑区/Dock 渲染、固定设置入口、原生按钮隐藏与恢复、当前布局读取 | `surface-manager.ts` 同时负责 DOM 创建、挂载目标查找、Dock 注册和销毁；与 `native-element-suppressor.ts` 的协作边界偏隐式，后续扩展新 surface 时风险较高 | `tests/surface-manager.test.ts`、`tests/runtime-snapshot.test.ts`、`tests/surface-metadata.test.ts` 覆盖较好，但更偏集成式，缺少 renderer 级或 target resolver 级单测 |
| 共享类型与预览模型 | `src/shared/types.ts`、`src/shared/preview-layout.ts`、`src/features/settings/types.ts` | 定义 surface/action/config/preview 结构，构建预览分区布局，为设置页和运行时共享数据模型 | 类型边界基本清晰，但设置页 provider 类型和 preview 交互类型仍集中在少数大文件中；随着设置页继续增长，可读性会继续下降 | `tests/preview-layout.test.ts`、`tests/surface-metadata.test.ts` 覆盖共享布局不变式 |

## 3. 按优先级排序的重构待办

| ID | 优先级 | 模块/场景 | 涉及文件 | 重构目标 | 风险等级 | 重构前测试清单 | 文档影响 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RF-101 | P0 | 设置页 controller 拆分与测试下沉 | `src/features/settings/use-settings-controller.ts`、`src/App.vue`、新增 `src/features/settings/controller/*` 或等价目录、相关测试 | 把设置页中的状态更新、副作用、拖拽、原生按钮禁用/恢复、导入导出拆成更小的纯函数或子 composable，并保留现有界面与交互行为不变 | 高 | - [x] 为 `resetConfig()`、`persist()`、`refreshCurrentLayout()` 建立 controller 级测试；- [x] 为预览拖拽和禁用栏规则补纯状态测试；- [x] 为插件命令 provider 切换/刷新补 controller 测试 | `docs/project-structure.md`：记录新的 settings 子模块；`README.md`：通常不变，仅在设置页能力描述变化时同步 | done |
| RF-102 | P0 | 入口依赖装配与实验能力执行器解耦 | `src/index.ts`、`src/core/runtime/plugin-runtime.ts`、新增运行时装配/执行器工厂模块、相关测试 | 将 `src/index.ts` 中的版本获取、实验功能适配、命令依赖装配和 runtime 构建拆开，使入口类只保留生命周期转发和最小 wiring | 高 | - [x] 为 `src/index.ts` 的 onload/onLayoutReady/onunload 增加装配层测试；- [x] 为实验快捷键/点击序列 support gating 补入口级测试；- [x] 为 provider 获取失败、版本获取失败和 clipboard fallback 保留回归测试 | `docs/project-structure.md`：记录 runtime factory / adapter 模块；`README.md`：同步实验能力的运行条件说明（若措辞需调整） | done |
| RF-103 | P1 | 设置页模板组件化 | `src/App.vue`、新增 `src/features/settings/components/*`、相关测试 | 将当前单文件模板拆成按钮列表、预览区、编辑区等子组件，保留 DOM 结构语义、样式类名和交互路径稳定，降低 `App.vue` 体量 | 中 | - [x] 为现有关键 DOM 查询路径建立回归测试；- [x] 为子组件 props / emits 边界补测试；- [x] 复跑 `tests/settings-app-layout.test.ts` 以锁定现有行为 | `docs/project-structure.md`：记录 settings 组件目录；`README.md`：通常无用户可见变化 | done |
| RF-104 | P1 | Surface 渲染职责拆分 | `src/core/surfaces/surface-manager.ts`、`src/core/surfaces/native-element-suppressor.ts`、新增 renderer / mount-target helper、相关测试 | 将 topbar/statusbar/canvas/dock 渲染和 mount target 查找拆分，明确与 native suppressor 的边界，避免 `surface-manager.ts` 继续膨胀 | 中 | - [x] 为 canvas mount target 解析补纯函数测试；- [x] 为 fixed open-settings topbar、不抑制 settings 预览、Dock 清理保留回归测试；- [x] 为 suppressor observer 目标选择补测试 | `docs/project-structure.md`：记录 surfaces 子模块结构；`README.md`：仅当可配置区域或行为说明变化时同步 | done |
| RF-105 | P2 | 动作默认值与配置回填规则统一 | `src/core/config/sanitize.ts`、`src/core/config/item-defaults.ts`、`src/core/config/defaults.ts`、`src/features/settings/action-config.ts`、相关测试 | 统一实验动作默认值、fallback selector、设置页 action 切换默认回填，减少跨模块重复规则，并显式锁定行为不变式 | 中 | - [x] 为 shortcut/click-sequence 的 create/sanitize/settings 三条路径补一致性测试；- [x] 为导入导出 round-trip 和恢复默认补回归测试；- [x] 为 legacy surface 迁移保留回归测试 | `docs/project-structure.md`：记录配置规则职责调整；`README.md`：通常无用户可见变化 | done |

优先级说明：
- `P0`：价值和风险都最高，优先执行
- `P1`：价值或风险中等，放在 `P0` 之后
- `P2`：低风险清理项，最后执行

状态说明：
- `pending`
- `in_progress`
- `done`
- `blocked`

## 3.1 条目细化：范围、不变式与风险

### RF-101

- 范围：设置页 controller 的状态变更、拖拽、导入导出、副作用调度；不改用户可见布局和文案
- 行为不变式：
  - 按钮增删改查、复制、排序、显隐切换行为保持不变
  - 原生按钮拖入禁用栏、拖回原区域恢复显示的语义保持不变
  - 读取当前布局、导入导出文件、实验动作编辑流程保持不变
- 风险：
  - 高扇出副作用较多，拆分不当会破坏 `persist()` 与 `refreshCurrentLayout()` 的顺序
  - 当前 `resetConfig()` 使用了未在该文件显式导入的 `createDefaultConfig()`，说明该路径缺少测试护栏；本条目应先补测试再动实现

### RF-102

- 范围：入口装配、实验能力执行器、runtime factory；不改变命令 ID、提示文案和 plugin 生命周期入口
- 行为不变式：
  - `open-settings`、`copy-config-json`、`restore-defaults` 命令保持原样
  - 版本获取失败时仍允许 runtime 启动
  - 实验能力未启用、前端不支持或版本不足时仍按当前逻辑提示并阻止执行
- 风险：
  - 依赖装配拆分会触及 `CommandExecutor`、`ExternalCommandRegistry`、`ConfigStore`、`SurfaceManager` 的交互边界
  - 若测试不先补齐，容易在入口 wiring 中引入回归但不被现有 runtime 测试立即发现

### RF-103

- 范围：仅拆设置页模板和组件边界，不调整业务规则和样式语义
- 行为不变式：
  - 现有类名、关键文案、按钮位置、可拖拽区域和表单交互保持稳定
  - `tests/settings-app-layout.test.ts` 依赖的关键 DOM 查询路径尽量不变
- 风险：
  - 当前测试大量直接查询 `App.vue` 渲染结果；组件化后若 DOM 包装层变化，测试和样式都可能一起回归

### RF-104

- 范围：Surface 渲染辅助函数和 suppressor 边界；不新增或移除任何可配置区域
- 行为不变式：
  - 固定设置按钮仍在顶栏最前
  - 顶栏、状态栏、编辑区、Dock 的现有挂载位置和销毁时机保持不变
  - settings 预览 UI 不应被 suppressor 误伤
- 风险：
  - 涉及真实 DOM 结构假设，若 helper 抽取不准确，可能只在思源真实环境中暴露问题

### RF-105

- 范围：默认值/清洗/回填规则统一；不改配置 schema 版本号和导入导出格式
- 行为不变式：
  - 已有配置文件仍能导入，legacy surface 迁移结果不变
  - experimental shortcut / click sequence 的默认值与当前行为一致
  - 设置页切换动作类型后的自动回填结果保持兼容
- 风险：
  - 该条目跨 config 层和 settings 层，若顺序安排不当，可能和 RF-101 产生冲突；建议放在 RF-101 之后

## 4. 执行日志

| ID | 开始日期 | 结束日期 | 验证命令 | 结果 | 已刷新文档 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| BASELINE | 2026-04-15 | 2026-04-15 | `npm test` | pass | 无 | 当前基线共 `24` 个测试文件、`148` 个测试通过 |
| RF-101 | 2026-04-15 | 2026-04-15 | `npm test -- tests/settings-controller.test.ts`; `npm test -- tests/settings-controller.test.ts tests/settings-action-config.test.ts tests/settings-app-layout.test.ts`; `npm test` | pass | 待定 | 已新增 `tests/settings-controller.test.ts`，并把 plugin-command 选择/校验与预览拖拽、原生按钮禁用交互从 `use-settings-controller.ts` 中拆到 `src/features/settings/controller/`；同时修复 `resetConfig()` 未导入 `createDefaultConfig()` 的缺陷 |
| RF-102 | 2026-04-15 | 2026-04-15 | `npm test -- tests/runtime-factory.test.ts`; `npm test -- tests/runtime-factory.test.ts tests/plugin-entry.test.ts tests/plugin-runtime.test.ts tests/command-executor.test.ts`; `npm test` | pass | 待定 | 已新增 `src/core/runtime/runtime-factory.ts` 与 `tests/runtime-factory.test.ts`，把已安装插件收集与实验动作 support gating / runner 闭包从 `src/index.ts` 中拆出 |
| RF-103 | 2026-04-15 | 2026-04-15 | `npm test -- tests/settings-components.test.ts`; `npm test -- tests/settings-app-layout.test.ts`; `npm test -- tests/settings-components.test.ts tests/settings-app-layout.test.ts`; `npm test` | pass | 待定 | 已新增 `src/features/settings/components/SettingsButtonListPanel.vue`、`src/features/settings/components/WorkspacePreviewPanel.vue` 与 `tests/settings-components.test.ts`；`App.vue` 改为组装组件，并修复“读取当前布局”按钮未绑定 controller 方法的问题 |
| RF-104 | 2026-04-15 | 2026-04-15 | `npm test -- tests/canvas-mount-target.test.ts`; `npm test -- tests/canvas-mount-target.test.ts tests/surface-manager.test.ts tests/runtime-snapshot.test.ts tests/surface-metadata.test.ts`; `npm test` | pass | 待定 | 已新增 `src/core/surfaces/canvas-mount-target.ts`、`src/core/surfaces/surface-elements.ts` 与 `tests/canvas-mount-target.test.ts`，把编辑区挂载目标解析和 surface element 创建从 `surface-manager.ts` 中拆出 |
| RF-105 | 2026-04-15 | 2026-04-15 | `npm test -- tests/config-item-defaults.test.ts`; `npm test -- tests/config-item-defaults.test.ts tests/config-store.test.ts tests/import-export.test.ts tests/settings-action-config.test.ts`; `npm test`; `npm run build` | pass | `docs/project-structure.md`、`README.md` | 已在 `src/core/config/item-defaults.ts` 集中实验动作 sanitize helper，`src/core/config/sanitize.ts` 复用统一规则；最终全量验证为 `28` 个测试文件、`159` 个测试通过，生产构建通过 |

## 5. 决策与确认

- 用户批准的条目：`RF-101`、`RF-102`、`RF-103`、`RF-104`、`RF-105`
- 延后的条目：无
- 阻塞条目及原因：无
- 推荐执行顺序：`RF-101 -> RF-102 -> RF-103 -> RF-104 -> RF-105`
- 说明：本轮尚未开始任何重构实现；等待用户按条目 ID 明确批准后再进入“先补测试、再改实现”的阶段

## 6. 文档刷新

- `docs/project-structure.md`：已刷新，记录 `src/features/settings/components/`、`src/features/settings/controller/`、`src/core/runtime/runtime-factory.ts`、`src/core/surfaces/canvas-mount-target.ts`、`src/core/surfaces/surface-elements.ts` 等当前结构
- `README.md`：已刷新，更新当前可配置区域、跨插件命令能力、原生按钮禁用说明、测试基线和模块结构摘要
- 最终同步检查：已完成；最终验证命令为 `npm test` 与 `npm run build`

## 7. 下一步

1. 所有获批条目已完成。
2. `docs/project-structure.md` 与 `README.md` 已刷新。
3. 后续如继续重构，建议优先评估编辑区 / Dock 行为的真实思源环境手工验证清单。
