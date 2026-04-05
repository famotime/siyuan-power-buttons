# Siyuan Power Buttons

为思源笔记提供一套插件自有的快捷按钮系统，支持把按钮配置到：

- 顶栏
- 状态栏左侧/右侧
- 左侧、右侧、底部 Dock

当前 V1 已包含：

- 可视化配置界面
- 多按钮增删改查
- 拖拽排序
- 内置命令、插件命令、自定义动作、URL 绑定
- 图标类型切换：内置图标 / Emoji / SVG
- JSON 导入导出
- 配置持久化

说明：

- Dock 基于思源稳定 `addDock()` API 实现，因此 V1 中 Dock 入口表现为“Dock 页签 + 面板内执行按钮”。
- V1 不包含原生工具栏接管，也不包含实验性内部命令适配。

开发命令：

```bash
npm install
npm test
npm run build
```
