# CDN 资源目录

## 概述

本目录包含 YiWeb 项目的前端共享资源，包括 Vue 组件库、工具函数、样式文件、Markdown 和 Mermaid 渲染系统。

## 目录结构

```
cdn/
├── components/       # Vue 组件库
├── utils/            # 工具函数库
├── styles/           # 样式文件
├── markdown/         # Markdown 渲染系统
└── mermaid/          # Mermaid 图表渲染系统
```

## 核心系统

### 1. Markdown 渲染系统 (`markdown/`)

提供完整的 Markdown 渲染能力，支持插件扩展。

**入口**: `/cdn/markdown/index.js`

**主要功能**:
- Markdown 转 HTML 渲染
- 插件系统（Containers, Accordion, Frontmatter, TOC, Sanitize, Mermaid等）
- 嵌套 Markdown 支持
- 内部链接处理

**使用示例**:
```javascript
import { createMarkdownRendererWithPlugins } from '/cdn/markdown/index.js';
const renderer = createMarkdownRendererWithPlugins();
const html = await renderer.render('# Hello World');
```

### 2. Mermaid 渲染系统 (`mermaid/`)

提供 Mermaid 图表渲染能力，支持工具栏、全屏、下载等功能。

**入口**: `/cdn/mermaid/index.js`

**主要功能**:
- Mermaid 图表渲染
- 工具栏插件
- 全屏模式
- 图表下载
- 剪贴板复制
- AI 修复

**使用示例**:
```javascript
import { createMermaidRendererWithPlugins } from '/cdn/mermaid/index.js';
const renderer = createMermaidRendererWithPlugins();
await renderer.initialize();
await renderer.renderDiagram('diagram-id', 'graph TD\nA-->B');
```

## 重构状态

**当前状态**: 第一阶段完成

- ✅ 文档完善
- ⏳ 待评估组件去留

**详细文档**: `../docs/重构cdn目录/`

## 导入规则

所有模块使用绝对路径导入，以 `/` 开头：

```javascript
import { logInfo } from '/cdn/utils/core/log.js';
import { createBaseView } from '/cdn/utils/view/baseView.js';
```
