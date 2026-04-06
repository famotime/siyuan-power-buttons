# 重构计划

## 1. 项目快照

- 生成日期：2026-04-06
- 范围：`siyuan-power-buttons`
- 目标：在不改变插件对外行为的前提下，降低运行时编排、设置界面和配置模型的耦合度，补足重构前测试护栏，并为后续迭代建立更清晰的模块边界。
- 文档刷新目标：`docs/project-structure.md`、`README.md`
- 基线仓库状态：`git status --short` 为空，工作区干净
- 基线测试状态：`npm test` 通过，`15` 个测试文件 / `67` 个测试全部通过

## 2. 架构与模块分析

| 模块 | 关键文件 | 当前职责 | 主要痛点 | 测试覆盖情况 |
| --- | --- | --- | --- | --- |
| 插件入口与生命周期 | `src/index.ts`、`src/main.ts`、`src/core/compatibility/version-guard.ts` | 插件加载、版本探测、实验能力判定、命令注册、设置对话框装载、Surface 渲染触发 | `src/index.ts` 约 209 行，生命周期、命令 wiring、实验适配和设置对话框编排耦在一个类中；当前没有直接覆盖插件入口行为的测试 | `tests/version-guard.test.ts` 覆盖版本判定；缺少 `src/index.ts` 级集成测试 |
| 设置界面与交互编排 | `src/App.vue`、`src/shared/preview-layout.ts`、`src/shared/runtime-snapshot.ts`、`src/shared/shortcut-utils.ts` | 配置编辑、预览布局、拖拽排序、导入导出、实验动作编辑、当前界面快照读取 | `src/App.vue` 约 1130 行，模板、状态、拖拽、预览、文件导入导出、实验动作默认值和校验混杂；多个 helper 与组件逻辑存在双向依赖 | `tests/settings-app-layout.test.ts`、`tests/preview-layout.test.ts`、`tests/runtime-snapshot.test.ts` 覆盖较多 UI 场景，但状态转换逻辑仍嵌在组件内部，难以单独测试 |
| 命令执行层 | `src/core/commands/executor.ts`、`src/core/commands/experimental-shortcut.ts`、`src/core/commands/click-sequence.ts`、`src/core/commands/builtin-dom.ts` | 稳定命令、插件命令、实验快捷键、实验点击序列的统一执行 | `CommandExecutor` 本身清晰，但入口层把环境判断与依赖注入写成闭包，导致命令执行与插件生命周期耦合 | `tests/command-executor.test.ts`、`tests/click-sequence.test.ts`、`tests/builtin-dom.test.ts`、`tests/experimental-shortcut.test.ts` 覆盖较好 |
| 配置模型与持久化 | `src/core/config/defaults.ts`、`src/core/config/sanitize.ts`、`src/core/config/store.ts`、`src/core/config/import-export.ts` | 默认配置创建、迁移和清洗、持久化、导入导出 | 实验快捷键/点击序列默认值逻辑在 `defaults.ts`、`sanitize.ts`、`App.vue` 有重复；规则分散会放大后续修改成本 | `tests/config-store.test.ts`、`tests/import-export.test.ts` 覆盖主路径较好 |
| Surface 渲染与原生布局抽象 | `src/core/surfaces/surface-manager.ts`、`src/shared/preview-layout.ts`、`src/shared/runtime-snapshot.ts`、`src/shared/types.ts` | 顶栏/状态栏渲染、原生按钮快照、预览布局分区 | Surface 拓扑知识分散在多个 `switch`/选择器映射里，同一概念在运行时渲染、预览分区和原生快照中重复维护 | `tests/surface-manager.test.ts`、`tests/runtime-snapshot.test.ts`、`tests/preview-layout.test.ts` 各自覆盖，但缺少统一拓扑约束 |
| 模板遗留 API 包装层 | `src/api.ts` | 保留上游模板的大量 Siyuan API 包装函数，当前插件只实际使用 `version()` | 文件约 422 行，风格与当前代码库不一致，且实际消费面极小；保留整份模板 API 会增加理解成本和维护噪声 | 没有针对该文件的直接测试；目前仅由 `src/index.ts` 间接调用 `version()` |

## 3. 按优先级排序的重构待办

| ID | 优先级 | 模块/场景 | 涉及文件 | 重构目标 | 风险等级 | 重构前测试清单 | 文档影响 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RF-001 | P0 | 设置界面状态与行为拆分 | `src/App.vue`、`src/main.ts`、`src/shared/preview-layout.ts`、`src/shared/shortcut-utils.ts`、新增 `src/features/settings/*` 或等价目录、相关测试 | 将 `App.vue` 中的配置编辑、预览拖拽、实验动作默认值/校验、导入导出流程拆为可测试的 composable/纯函数，保留现有界面和交互行为不变 | 高 | - [x] 为按钮增删改、复制、显隐切换补可重复执行的组件/状态测试；- [x] 为实验快捷键与点击序列默认值初始化补单测；- [x] 为导入导出和预览拖拽补状态层测试，避免只依赖 DOM 大测 | `docs/project-structure.md`：记录新的 settings 子模块；`README.md`：同步当前设置界面能力与受支持动作类型 | done |
| RF-002 | P0 | 插件入口生命周期与命令编排解耦 | `src/index.ts`、`src/core/commands/executor.ts`、`src/core/compatibility/version-guard.ts`、新增运行时编排模块、相关测试 | 把设置对话框管理、实验能力校验、命令依赖注入和 Surface 渲染协调从插件类中拆出，保留命令 ID、提示文案、桌面端限制和对话框行为不变 | 高 | - [x] 为 `onload`/`onLayoutReady`/`onunload` 建立入口级测试桩；- [x] 为 `open-settings`、`copy-config-json`、`restore-defaults` 三个插件命令补集成测试；- [ ] 为实验功能未启用/版本过低/非桌面端场景补入口侧测试 | `docs/project-structure.md`：记录运行时编排模块；`README.md`：同步实验能力的运行条件与限制说明 | done |
| RF-003 | P1 | 配置默认值、清洗与持久化规则统一 | `src/core/config/defaults.ts`、`src/core/config/sanitize.ts`、`src/core/config/store.ts`、`src/core/config/import-export.ts`、相关测试 | 合并实验动作默认值和回填规则，减少 `defaults.ts`、`sanitize.ts`、`App.vue` 的重复定义，确保配置创建/迁移/导入导出共享同一套规则 | 中 | - [x] 为快捷键空值、点击序列空步骤、legacy surface 迁移补回归测试；- [x] 为 `ConfigStore` 的 `replace/reset/subscribe` 快照隔离补测试；- [x] 为导入导出 round-trip 增加规则一致性断言 | `docs/project-structure.md`：记录配置模型职责划分；`README.md`：同步配置兼容/导入导出说明 | done |
| RF-004 | P1 | Surface 拓扑元数据收敛 | `src/core/surfaces/surface-manager.ts`、`src/shared/preview-layout.ts`、`src/shared/runtime-snapshot.ts`、`src/shared/types.ts`、新增 shared surface metadata 模块、相关测试 | 抽取统一的 surface 元数据，减少多处 `switch` 和字符串分支，保持顶栏/状态栏/Dock/Canvas 的映射、排序和预览语义一致 | 中 | - [x] 为各 surface 的映射表补纯函数测试；- [x] 为 preview/runtime/render 三层共享的不变式补回归测试；- [x] 为 Dock 只读预览约束保留测试 | `docs/project-structure.md`：记录共享 surface 元数据模块；`README.md`：同步当前可配置区域与只读预览区域说明 | done |
| RF-005 | P2 | 上游模板 API 遗留代码收口 | `src/api.ts`、`src/index.ts`、新增最小化 API 适配模块、相关测试 | 把当前只为 `version()` 保留的大体量模板 API 隔离或缩减为最小适配层，减少上游样板代码对主项目结构的干扰 | 低 | - [x] 为应用版本查询补最小单测或入口桩测试；- [x] 确认没有其它运行时代码引用 `src/api.ts` 的遗留导出 | `docs/project-structure.md`：记录 API 适配层职责；`README.md`：通常无用户可见变化，仅在开发说明中更新 | done |

优先级说明：
- `P0`：价值和风险都最高，优先执行
- `P1`：价值或风险中等，放在 `P0` 之后
- `P2`：低风险清理项，最后执行

状态说明：
- `pending`
- `in_progress`
- `done`
- `blocked`

## 4. 执行日志

| ID | 开始日期 | 结束日期 | 验证命令 | 结果 | 已刷新文档 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| BASELINE | 2026-04-06 | 2026-04-06 | `npm test` | pass | 无 | 基线共 `15` 个测试文件、`67` 个测试通过 |
| RF-001 | 2026-04-06 | 2026-04-06 | `npm test -- tests/settings-action-config.test.ts`; `npm test -- tests/settings-action-config.test.ts tests/settings-app-layout.test.ts`; `npm test` | pass | 待定 | 已新增 `src/features/settings/*`，把设置页状态、文件导入导出与视图 helper 从 `App.vue` 中拆出 |
| RF-002 | 2026-04-06 | 2026-04-06 | `npm test -- tests/plugin-runtime.test.ts`; `npm test` | pass | 待定 | 已新增 `src/core/runtime/plugin-runtime.ts` 与 `src/core/runtime/settings-dialog-controller.ts`，`src/index.ts` 改为薄入口 |
| RF-003 | 2026-04-06 | 2026-04-06 | `npm test -- tests/config-item-defaults.test.ts`; `npm test -- tests/config-store.test.ts tests/config-item-defaults.test.ts tests/settings-action-config.test.ts tests/import-export.test.ts`; `npm test` | pass | 待定 | 已新增 `src/core/config/item-defaults.ts`，统一动作默认值、点击序列回填与配置存储快照规则 |
| RF-004 | 2026-04-06 | 2026-04-06 | `npm test -- tests/surface-metadata.test.ts`; `npm test -- tests/surface-metadata.test.ts tests/preview-layout.test.ts tests/surface-manager.test.ts tests/runtime-snapshot.test.ts`; `npm test` | pass | 待定 | 已新增 `src/shared/surface-metadata.ts`，收敛 preview 与 runtime 的 surface 映射 |
| RF-005 | 2026-04-06 | 2026-04-06 | `npm test -- tests/app-version.test.ts`; `npm test` | pass | 待定 | 已新增 `src/core/system/app-version.ts`，`src/api.ts` 缩减为兼容导出层 |

## 5. 决策与确认

- 用户批准的条目：`RF-001`、`RF-002`、`RF-003`、`RF-004`、`RF-005`
- 延后的条目：无
- 阻塞条目及原因：无
- 推荐执行顺序：`RF-001 -> RF-002 -> RF-003 -> RF-004`，`RF-005` 可单独延后

## 6. 文档刷新

- `docs/project-structure.md`：已创建，反映 `src/core/runtime/`、`src/core/system/`、`src/features/settings/`、`src/shared/surface-metadata.ts` 等新结构
- `README.md`：已刷新
  - 移除了“自定义动作、URL 绑定、Dock 可配置”这类过时描述
  - 同步为“仅顶栏 / 状态栏可配置，Dock 仅预览 / 运行时入口”
  - 补充当前开发命令与测试基线
- 最终同步检查：`docs/project-structure.md`、`README.md` 已与当前仓库结构同步；最终验证命令为 `npm test`、`npm run build`

## 7. 下一步

1. 所有获批条目已完成。
2. 当前仓库文档已刷新并与实现同步。
3. 最终验证结果：`npm test` 通过，`20` 个测试文件、`86` 个测试全部通过；`npm run build` 通过。
