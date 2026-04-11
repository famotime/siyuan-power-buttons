# Project Structure

## Overview

`siyuan-power-buttons` 现在按“入口编排 / 配置模型 / 命令执行 / Surface 渲染 / 设置页 / 共享抽象”拆分，核心代码集中在 `src/`，测试集中在 `tests/`。

## Source Tree

| 路径 | 角色 |
| --- | --- |
| `src/index.ts` | 插件入口；组装 `ConfigStore`、`CommandExecutor`、运行时编排与版本保护 |
| `src/main.ts` | Vue 设置页挂载入口 |
| `src/App.vue` | 设置页模板；脚本层已下沉到 settings controller |
| `src/core/commands/` | 按钮动作执行：内置命令、插件命令、外部插件命令 provider 协议/发现、实验快捷键、实验点击序列、DOM 查询 |
| `src/core/compatibility/version-guard.ts` | 实验能力的版本与前端环境保护 |
| `src/core/config/` | 默认配置、清洗迁移、共享默认值、导入导出、持久化存储 |
| `src/core/runtime/` | 插件运行时编排与设置对话框控制器 |
| `src/core/surfaces/` | 顶栏 / 状态栏 / Dock 的渲染与销毁 |
| `src/core/system/app-version.ts` | 最小化的思源版本查询适配层 |
| `src/features/settings/` | 设置页控制器、动作规则、文件导入导出、视图 helper、Props 类型 |
| `src/shared/` | 跨模块共享类型、常量、icon 渲染、预览布局、运行时快照、surface 元数据、工具函数 |
| `src/components/SiyuanTheme/` | 复用的思源风格基础组件 |
| `src/i18n/` | 多语言资源 |
| `src/types/` | Siyuan API 与全局类型声明 |
| `src/api.ts` | 兼容导出层，当前仅保留 `version()` 到最小适配模块的转发 |

## Core Flows

### 1. Plugin Runtime

1. `src/index.ts` 创建 `ConfigStore`、`CommandExecutor`。
2. `src/core/runtime/plugin-runtime.ts` 注册插件命令，刷新外部 provider 列表，处理 `onload` / `onLayoutReady` / `onunload`。
3. `src/core/runtime/settings-dialog-controller.ts` 负责打开、刷新、销毁设置对话框。

### 1.1 External Provider Integration

1. `src/core/commands/external-command-types.ts` 定义跨插件 command provider 协议与 `providerId:commandId` 编解码规则。
2. `src/core/commands/external-command-registry.ts` 扫描已安装插件实例，缓存公开 provider 与命令目录。
3. `src/core/commands/executor.ts` 负责把 `external-plugin-command` 绑定解析后转发给目标 provider。

### 2. Settings UI

1. `src/main.ts` 挂载 `src/App.vue`。
2. `src/features/settings/use-settings-controller.ts` 管理设置页状态、拖拽、导入导出、实验动作编辑。
3. `src/features/settings/action-config.ts` 与 `src/core/config/item-defaults.ts` 共享实验动作默认值规则。

### 3. Config Lifecycle

1. `src/core/config/defaults.ts` 生成默认按钮配置。
2. `src/core/config/sanitize.ts` 负责导入、迁移与兜底。
3. `src/core/config/store.ts` 负责持久化、订阅与快照隔离。
4. `src/core/config/import-export.ts` 负责 JSON 导入导出。

### 4. Surface & Preview Model

1. `src/shared/surface-metadata.ts` 提供统一 surface 拓扑元数据。
2. `src/shared/preview-layout.ts` 根据元数据构建预览布局。
3. `src/shared/runtime-snapshot.ts` 读取原生界面按钮快照。
4. `src/core/surfaces/surface-manager.ts` 在真实界面渲染插件按钮。

## Tests

| 路径 | 覆盖重点 |
| --- | --- |
| `tests/settings-app-layout.test.ts` | 设置页布局与交互回归 |
| `tests/settings-action-config.test.ts` | 设置页实验动作默认值与回填规则 |
| `tests/plugin-runtime.test.ts` | 插件运行时编排与设置对话框控制器 |
| `tests/config-store.test.ts` | 配置模型、迁移与 `ConfigStore` 快照隔离 |
| `tests/config-item-defaults.test.ts` | 共享配置默认值规则 |
| `tests/preview-layout.test.ts` / `tests/runtime-snapshot.test.ts` / `tests/surface-metadata.test.ts` | 预览与 Surface 拓扑一致性 |
| `tests/command-executor.test.ts` / `tests/external-command-registry.test.ts` / `tests/external-command-types.test.ts` / `tests/experimental-shortcut.test.ts` / `tests/click-sequence.test.ts` | 命令执行、外部 provider 协议/发现与实验动作行为 |
| `tests/app-version.test.ts` | 最小化版本查询适配层 |

## Non-Goals / Notes

- 当前可配置区域只有 `topbar`、`statusbar-left`、`statusbar-right`。
- Dock 仍通过稳定 `addDock()` API 暴露，配置界面里作为原生布局预览区域存在，不支持把自定义按钮拖入 Dock。
- `plugin-sample-vite-vue/` 仍是上游模板样例，和当前主代码结构解耦。
