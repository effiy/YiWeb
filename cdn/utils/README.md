# 工具函数库

## 概述

提供 YiWeb 项目的共享工具函数，包括核心工具、视图工具、UI 工具、浏览器工具等。

## 目录结构

```
cdn/utils/
├── index.js          # 统一导出（可选）
├── core/             # 核心工具
│   ├── log.js        # 日志工具
│   ├── error.js      # 错误处理
│   ├── common.js     # 通用工具
│   ├── validation.js # 验证工具
│   ├── animation.js  # 动画工具
│   ├── string.js     # 字符串处理
│   ├── array.js      # 数组处理
│   ├── object.js     # 对象处理
│   ├── http.js       # HTTP 请求
│   ├── storage.js    # 本地存储
│   ├── eventBus.js   # 事件总线
│   ├── performance.js # 性能工具
│   ├── form.js       # 表单工具
│   ├── i18n.js       # 国际化
│   └── api.js        # API 工具
├── view/             # 视图工具
│   ├── baseView.js   # Vue 应用工厂（重要）
│   ├── componentLoader.js # 组件加载器（重要）
│   └── index.js
├── ui/               # UI 工具
│   ├── message.js    # 消息提示
│   └── loading.js    # 加载状态
├── browser/          # 浏览器工具
│   ├── dom.js        # DOM 操作
│   └── events.js     # 事件处理
├── time/             # 时间工具
│   └── index.js
└── render/           # 渲染工具
    └── index.js
```

## 核心工具

### log.js - 日志工具

```javascript
import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';

logInfo('消息', data);
logWarn('警告', data);
logError('错误', error);
```

### error.js - 错误处理

```javascript
import { safeExecute, createError, setupBrowserExtensionErrorFilter } from '/cdn/utils/core/error.js';

// 安全执行函数
safeExecute(() => {
  // 代码
}, '上下文', (errorInfo) => {
  // 错误处理
});

// 启用浏览器扩展错误过滤
setupBrowserExtensionErrorFilter('App');
```

### common.js - 通用工具

```javascript
import { safeGetItem, safeSetItem } from '/cdn/utils/core/common.js';
```

## 视图工具（重要）

### baseView.js - Vue 应用工厂

这是创建 Vue 应用的核心工厂函数。

```javascript
import { createBaseView } from '/cdn/utils/view/baseView.js';

const app = await createBaseView({
  createStore: () => store,
  useComputed,
  useMethods,
  components: ['YiButton', 'YiModal', ...],
  componentModules: ['/path/to/component.js', ...],
  cssFiles: ['/path/to/style.css'],
  onMounted: (app) => { /* ... */ }
});
```

**详细文档**: 参见 `../../docs/architecture.md`

### componentLoader.js - 组件加载器

负责 Vue 组件的异步加载、样式注入和模板缓存。

```javascript
import { registerGlobalComponent, loadCSS, loadTemplate } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
  name: 'YiButton',
  css: '/cdn/components/common/buttons/YiButton/index.css',
  html: '/cdn/components/common/buttons/YiButton/template.html',
  component: { /* ... */ }
});
```

## UI 工具

### message.js - 消息提示

### loading.js - 加载状态

## 浏览器工具

### dom.js - DOM 操作

### events.js - 事件处理

## 依赖关系

**被以下系统依赖**:
- `cdn/markdown/` - Markdown 渲染系统
- `cdn/mermaid/` - Mermaid 渲染系统
- `cdn/components/` - 所有 Vue 组件
- `src/views/aicr/` - AICR 应用

## 重构状态

**重要**: 本目录为 Markdown 和 Mermaid 系统的核心依赖，**不会被删除**。
