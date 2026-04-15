# Siyuan Power Buttons

为思源笔记提供一套可视化配置的快捷按钮系统。

当前支持把自定义按钮放到：

- 顶栏
- 状态栏左侧
- 状态栏右侧
- 编辑区

当前功能：

- 可视化配置界面
- 多按钮增删改查
- 列表拖拽排序
- 预览区拖拽调整顶栏 / 状态栏 / 编辑区位置
- 内置命令、当前插件命令、跨插件 provider 命令
- 图标类型切换：内置图标 / Emoji / SVG
- JSON 配置文件导入导出
- 配置持久化
- 原生顶栏 / 状态栏 / Dock / 编辑区按钮快照预览
- 可在预览禁用栏隐藏部分原生按钮入口

实验能力：

- `实验：快捷键适配`
  - 先按思源 `keymap` 反查命令
  - 能回退到稳定内置命令或插件命令执行
  - 覆盖不到时再向编辑器 / `body` / `window` 派发按键
- `实验：点击序列`
  - 支持简单标识符、`text:` 文本匹配、原始 CSS 选择器
  - 支持等待、重试、步骤后延迟、失败即停止

限制与说明：

- 默认关闭
- 当前仅面向桌面端
- 依赖思源当前 DOM 结构、焦点状态和版本实现
- 运行时会做环境与版本保护，不满足条件时会直接提示并阻止执行
- 当前设置界面不再提供 `open-url` 或其它自定义动作类型。
- Dock 仍基于思源稳定 `addDock()` API 暴露运行时入口；在设置页中，Dock 仅作为原生布局预览区域，不支持拖入自定义按钮。
- 当前仍不包含原生工具栏接管。

开发命令：

```bash
npm install
npm test
npm run test:watch
npm run dev
npm run build
```

当前测试基线：

- `28` 个测试文件
- `159` 个测试全部通过

当前模块结构摘要：

- `src/index.ts` 是薄入口，运行时 helper 位于 `src/core/runtime/`。
- 设置页状态在 `src/features/settings/use-settings-controller.ts`，子组件与 controller helper 位于 `src/features/settings/components/` 和 `src/features/settings/controller/`。
- Surface 渲染由 `src/core/surfaces/surface-manager.ts` 调度，编辑区挂载和 DOM element 创建已拆到独立 helper。
