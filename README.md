# 我想偷点懒——快捷按钮随心按，常用功能一键达

思源笔记插件开发

## 楔子：为什么我需要快捷按钮？

最近在开发几个插件，开发过程中需要频繁重启插件以调试最新代码，重启操作需要多步点击，进入设置-集市页面操作，操作多了我就希望有个一键直达功能：

![image](https://raw.githubusercontent.com/famotime/siyuan-power-buttons/main/assets/image-20260418110226-9o9euuj.png)

类似的，在开发调试中英双语插件时，切换中英文界面需要 5 个点击步骤：

![image](https://raw.githubusercontent.com/famotime/siyuan-power-buttons/main/assets/image-20260418100341-cy7hi7r.png)

为了偷点懒，我希望将这些点击操作步骤自动化：

<video controls="controls" src="https://raw.githubusercontent.com/famotime/siyuan-power-buttons/main/assets/录屏助手_20260418_100548-20260418100653-ixrwdiq.mp4"></video>

‍

当然，每个人都会有各自日常需要快速触达一项功能的场景，有些高频操作可以通过思源笔记的快捷键设置来解决，代价是你需要记忆快捷键；还有些操作（比如上面两个场景）则无法通过快捷键完成。

如果能够将自定义操作设置为一个快捷按钮，随你心意放在你习惯的工具栏位置，应该是个不错的想法？

## “随心按”插件简介

为此我开发了思源笔记“随心按”插件，让每个人可以针对自己在思源笔记中的高频操作配置快捷按钮：

![image](https://raw.githubusercontent.com/famotime/siyuan-power-buttons/main/assets/image-20260418105905-x2fmbv4.png)

快捷按钮设置整体还是比较直观的，左边是按钮列表和位置预览，右边是按钮设置：

- 提供四种快捷按钮的设置方式（从易到难）：内置命令、插件命令、快捷键适配（实验性）、点击序列（实验性）；
- 支持与其他插件联动，直接创建其他插件命令的快捷按钮（当前已支持：思源文档助手、思源图片快剪插件）；
- 预置了一些常用功能的快捷按钮，可以参考预设编辑你自己的自定义按钮；
- 按钮支持放置在底栏（状态栏）、顶栏、编辑区、浮动工具栏，以及**专属独立侧面板**（在右侧栏一键展开快捷面板，集中管理高频操作）；
- 独立侧面板顶部提供设置快捷入口，内部采用自适应网格卡片展示按钮，并提供友好空状态；
- 支持隐藏部分原生按钮；
- 预集成字节IconPark的2500+开源图标，让每个快捷按钮都能找到合适的图标；
- 支持按钮配置的导入导出，方便社区分享实用配置；

![image](https://raw.githubusercontent.com/famotime/siyuan-power-buttons/main/assets/image-20260426125044-aawxj0i.png)

偷懒不是坏事，懒惰是技术进步的驱动力。

‍

“随心按”插件功能介绍、使用方法，以及基于试用的意见和建议，可以在思源社区的以下帖子中讨论：[快捷按钮“随心按”，常用功能一键达——使用指南 - 链滴](https://ld246.com/article/1777179578231)

‍
