# 03 设计文档 - 项目初始化

## 模块划分

### 核心层（cdn/utils/core/）

| 模块 | 职责 | 关键导出 |
|------|------|---------|
| `api.js` | API 客户端类 | `ApiClient`, `ApiError` |
| `http.js` | 底层 HTTP 工具 | `get`, `post`, `addRequestInterceptor` |
| `error.js` | 错误处理 | `ErrorTypes`, `ErrorCodes`, `safeExecute` |
| `log.js` | 日志工具 | `logInfo`, `logWarn`, `logError` |
| `storage.js` | 存储封装 | localStorage 操作 |
| `eventBus.js` | 事件总线 | 跨组件通信 |

### 视图层（cdn/utils/view/）

| 模块 | 职责 | 关键导出 |
|------|------|---------|
| `baseView.js` | 视图工厂 | `createBaseView` |
| `componentLoader.js` | 组件加载 | `loadCSS`, `loadComponent` |
| `registry.js` | 组件注册 | `registerGlobalComponent` |

### UI 层（cdn/utils/ui/）

| 模块 | 职责 |
|------|------|
| `message.js` | 消息提示 |
| `dialog.js` | 对话框 |
| `loading.js` | 加载指示器 |

### 组件层（cdn/components/）

```
components/
├── common/
│   ├── buttons/     (YiButton, YiIconButton)
│   ├── forms/       (YiSelect)
│   ├── modals/      (YiModal)
│   ├── loaders/     (YiLoading)
│   ├── feedback/    (YiEmptyState, YiErrorState)
│   └── tags/        (YiTag)
└── business/
    ├── SearchHeader
    ├── MarkdownView
    └── SkeletonLoader
```

### Markdown 渲染层（cdn/markdown/）

```
markdown/
├── core/
│   ├── PluginSystem.js
│   ├── MarkdownRenderer.js
│   └── index.js
└── plugins/
    ├── SanitizePlugin.js
    ├── MermaidPlugin.js
    ├── ContainersPlugin.js
    ├── AccordionPlugin.js
    ├── FrontmatterPlugin.js
    ├── TocPlugin.js
    ├── InternalLinkPlugin.js
    ├── TableCellMarkdownPlugin.js
    └── NestedMarkdownPlugin.js
```

### 应用层（src/views/aicr/）

```
aicr/
├── components/        # 页面组件
├── hooks/             # 状态管理与方法
│   ├── state/         # Store 状态定义
│   ├── methods/       # 方法子模块
│   └── index.js       # 统一导出
├── styles/            # 页面样式
└── utils/             # 页面工具
```

## 接口规范

### createBaseView 接口

```javascript
createBaseView({
    createStore: () => store,     // Store 工厂
    useComputed: (store) => {},   // 计算属性工厂
    useMethods: (store) => {},    // 方法工厂
    components: ['ComponentName'], // 组件名列表
    componentModules: ['/path/to/component.js'], // 组件路径列表
    data: {},                      // 暴露给模板的数据
    cssFiles: ['/path/to/style.css'],
    rootTemplate: null,            // 可选根模板
    onError: (err) => {}          // 错误处理
});
```

### createStore 接口

```javascript
const store = createStore();

// 状态（Vue ref）
store.sessions.value
store.fileTree.value
store.loading.value

// 方法
store.loadSessions()
store.loadFileTree()
store.toggleSidebar()
```

### 组件接口

组件使用 Vue 3 组合式 API：

```javascript
export default {
    name: 'YiButton',
    props: { type: String, disabled: Boolean },
    setup(props, { emit }) {
        // ...
        return { /* 模板使用的数据 */ };
    }
};
```

## 数据流

```
用户交互 ──→ useMethods ──→ Store Ops ──→ API 调用 ──→ 服务端
                              │
                              ▼
                           更新 state
                              │
                              ▼
                        Vue 响应式更新 ──→ UI 重渲染
```

## 约束

- 无构建工具，不能依赖打包优化
- CDN 加载存在网络延迟，需处理加载失败
- 浏览器兼容性要求：支持 ES Modules 和原生 fetch

## Postscript: Future Planning & Improvements

- 评估组件层是否需要进一步拆分
- 考虑引入类型定义文件（JSDoc 或 .d.ts）
