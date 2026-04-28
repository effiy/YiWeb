# Markdown 渲染系统

## 概述

提供完整的 Markdown 渲染能力，采用模块化设计，支持插件扩展。

## 目录结构

```
cdn/markdown/
├── index.js          # 主入口
├── core/             # 核心模块
│   ├── index.js      # 核心导出
│   ├── MarkdownRenderer.js   # 渲染器核心
│   └── PluginSystem.js       # 插件系统
└── plugins/          # 插件集合
    ├── index.js      # 插件导出
    ├── ContainersPlugin.js   # 容器语法
    ├── AccordionPlugin.js    # 折叠面板
    ├── FrontmatterPlugin.js  # Frontmatter
    ├── TocPlugin.js          # 目录生成
    ├── InternalLinkPlugin.js # 内部链接
    ├── SanitizePlugin.js     # HTML 净化
    ├── MermaidPlugin.js      # Mermaid 集成
    ├── TableCellMarkdownPlugin.js  # 表格单元格 Markdown
    └── NestedMarkdownPlugin.js      # 嵌套 Markdown
```

## 快速开始

### 创建带插件的渲染器

```javascript
import { createMarkdownRendererWithPlugins } from '/cdn/markdown/index.js';

const renderer = createMarkdownRendererWithPlugins({
  breaks: true,
  gfm: true
});
```

### 渲染 Markdown

```javascript
const html = await renderer.render(`
# 标题

这是一段 **Markdown** 文本。

- 列表项 1
- 列表项 2

::: tip 提示
这是一个提示容器
:::
`);
```

## 核心类

### MarkdownRenderer

主要渲染器类，负责 Markdown 解析和 HTML 生成。

**主要方法**:
- `constructor(options)` - 创建渲染器实例
- `use(plugin, options)` - 注册插件
- `render(markdown, options)` - 渲染 Markdown

### PluginManager

插件管理器，负责插件的注册和执行。

## 插件列表

| 插件 | 功能 |
|------|------|
| ContainersPlugin | 支持 ::: 容器语法 |
| AccordionPlugin | 支持折叠面板 |
| FrontmatterPlugin | 解析 YAML Frontmatter |
| TocPlugin | 生成目录 |
| InternalLinkPlugin | 处理内部链接 |
| SanitizePlugin | 净化 HTML |
| MermaidPlugin | 集成 Mermaid 图表 |
| TableCellMarkdownPlugin | 表格单元格支持 Markdown |
| NestedMarkdownPlugin | 支持嵌套 Markdown |

## 依赖

- 外部: `marked` 库（通过 `window.marked` 访问）
- 内部: `cdn/utils/core/` 工具函数

## 项目中的使用

被以下模块使用:
- `src/views/aicr/components/codeView/` - 代码审查页面的 Markdown 渲染
- `cdn/components/business/MarkdownView/` - Markdown 视图组件
