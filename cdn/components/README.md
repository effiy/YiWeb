# Vue 组件库

## 概述

提供 YiWeb 项目的共享 Vue 组件，包括通用组件和业务组件。

**当前状态**: 待评估去留（AICR 正在使用）

## 目录结构

```
cdn/components/
├── common/           # 通用组件
│   ├── buttons/      # 按钮组件
│   │   ├── YiButton/
│   │   └── YiIconButton/
│   ├── feedback/     # 反馈组件
│   │   ├── YiEmptyState/
│   │   └── YiErrorState/
│   ├── loaders/      # 加载组件
│   │   └── YiLoading/
│   ├── modals/       # 模态框组件
│   │   └── YiModal/
│   ├── forms/        # 表单组件
│   │   └── YiSelect/
│   └── tags/         # 标签组件
│       └── YiTag/
└── business/         # 业务组件
    ├── MarkdownView/ # Markdown 视图
    ├── SearchHeader/ # 搜索头部
    └── SkeletonLoader/ # 骨架屏
```

## AICR 正在使用的组件

以下组件在 `src/views/aicr/index.js` 中被引用：

### 通用组件
- `YiModal` - 模态框
- `YiLoading` - 加载状态
- `YiEmptyState` - 空状态
- `YiErrorState` - 错误状态
- `YiIconButton` - 图标按钮
- `YiButton` - 按钮
- `YiTag` - 标签
- `YiSelect` - 选择器

### 业务组件
- `SearchHeader` - 搜索头部
- `MarkdownView` - Markdown 视图
- `SkeletonLoader` - 骨架屏

## 组件使用方式

### 注册全局组件

```javascript
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
  name: 'YiButton',
  css: '/cdn/components/common/buttons/YiButton/index.css',
  html: '/cdn/components/common/buttons/YiButton/template.html',
  component: {
    props: { /* ... */ },
    setup() { /* ... */ }
  }
});
```

### 在 createBaseView 中使用

```javascript
import { createBaseView } from '/cdn/utils/view/baseView.js';

const app = await createBaseView({
  // ...
  components: ['YiButton', 'YiModal', ...],
  componentModules: [
    '/cdn/components/common/buttons/YiButton/index.js',
    '/cdn/components/common/modals/YiModal/index.js',
    // ...
  ]
});
```

## 重构状态

**当前状态**: 已完成精简（2026-04-28）

- ✅ 第一阶段：文档完善（已完成）
- ✅ 第二阶段：方案C - 彻底精简（已完成）

**已删除的组件**（13个）:
- YiDialog, YiInput, YiCheckbox, YiRadio, YiSwitch, YiForm, YiFormItem, YiCalendar
- YiTooltip, YiBadge, YiTable, YiDropdown, YiPagination

**保留的组件**（11个，AICR 正在使用）:
- YiButton, YiIconButton, YiTag, YiModal, YiSelect, YiLoading
- YiEmptyState, YiErrorState, MarkdownView, SearchHeader, SkeletonLoader

**详细文档**: 参见 `../../docs/重构cdn目录/`
