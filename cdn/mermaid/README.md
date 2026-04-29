# Mermaid 渲染系统

## 概述

提供 Mermaid 图表渲染能力，支持工具栏、全屏、下载等功能，采用插件化设计。

## 目录结构

```
cdn/mermaid/
├── index.js          # 主入口
├── core/             # 核心模块
│   ├── index.js      # 核心导出
│   ├── MermaidRenderer.js    # 渲染器核心
│   └── MermaidConfig.js      # 配置管理
└── plugins/          # 插件集合
    ├── index.js      # 插件导出
    ├── ToolbarPlugin.js      # 工具栏
    ├── FullscreenPlugin.js   # 全屏模式
    ├── DownloadPlugin.js     # 图表下载
    ├── ClipboardPlugin.js    # 剪贴板复制
    └── AIFixPlugin.js        # AI 修复
```

## 快速开始

### 创建带插件的渲染器

```javascript
import { createMermaidRendererWithPlugins } from '/cdn/mermaid/index.js';

const renderer = createMermaidRendererWithPlugins({
  autoAdjustSize: true,
  showLoading: true,
  showErrorDetails: true,
  enableRetry: true,
  maxRetries: 2
});
```

### 初始化并渲染

```javascript
// 初始化
await renderer.initialize();

// 渲染图表
await renderer.renderDiagram('my-diagram', `
graph TD
  A[开始] --> B[处理]
  B --> C[结束]
`);
```

## 核心类

### MermaidRenderer

主要渲染器类，负责 Mermaid 图表的初始化和渲染。

**主要方法**:
- `constructor(options)` - 创建渲染器实例
- `use(plugin, options)` - 注册插件
- `initialize()` - 初始化 Mermaid
- `renderDiagram(id, code, options)` - 渲染图表
- `validateCode(code)` - 验证图表代码
- `processRenderQueue()` - 处理渲染队列

### MermaidConfig

配置管理类，提供 Mermaid 初始化配置。

## 插件列表

| 插件 | 功能 |
|------|------|
| ToolbarPlugin | 提供操作工具栏 |
| FullscreenPlugin | 全屏查看图表 |
| DownloadPlugin | 下载图表为图片/SVG |
| ClipboardPlugin | 复制图表到剪贴板 |
| AIFixPlugin | AI 辅助修复图表代码 |

## 支持的图表类型

- flowchart (流程图)
- sequenceDiagram (时序图)
- classDiagram (类图)
- stateDiagram (状态图)
- gantt (甘特图)
- pie (饼图)
- 以及更多 Mermaid 支持的类型...

## 依赖

- 外部: `mermaid` 库（通过 `window.mermaid` 访问）
- 内部: `cdn/utils/core/` 工具函数

## 项目中的使用

被以下模块使用:
- `cdn/markdown/plugins/MermaidPlugin.js` - Markdown 中的 Mermaid 支持
- AICR 页面的 Markdown 渲染
