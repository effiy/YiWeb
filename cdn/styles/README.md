# 样式文件目录

## 概述

提供 YiWeb 项目的共享样式文件。

## 目录结构

```
cdn/styles/
├── index.css          # 主样式入口
├── theme.css          # 主题样式
├── utils.css          # 工具样式
├── base/              # 基础样式
│   ├── reset.css      # 重置样式
│   ├── layout.css     # 布局样式
│   ├── typography.css # 排版样式
│   ├── spacing.css    # 间距样式
│   └── display.css    # 显示样式
├── components/        # 组件样式
│   ├── scrollbar.css  # 滚动条样式
│   ├── tooltips.css   # 提示框样式
│   └── syntax-highlight.css # 语法高亮样式
└── utilities.css      # 工具类
```

## 使用方式

### 在 HTML 中引入

```html
<link rel="stylesheet" href="/cdn/styles/index.css">
```

### 在组件中引入

```javascript
import { loadCSS } from '/cdn/utils/view/componentLoader.js';

loadCSS('/cdn/styles/index.css');
```

### 在 createBaseView 中使用

```javascript
const app = await createBaseView({
  // ...
  cssFiles: ['/cdn/styles/index.css']
});
```

## 重构状态

**当前状态**: 待评估

- 样式文件与组件库配套使用
- 如组件库调整，样式也需要相应调整

**详细文档**: 参见 `../../docs/重构cdn目录/`
