# 项目架构约定

## 技术栈

- **Vue 3**（CDN 方式，组合式 API）
- **原生 ES Modules**（无构建工具）
- **Markdown-it / Marked.js**（Markdown 渲染，插件化扩展）
- **Mermaid.js**（图表渲染）
- **Font Awesome**（图标库）

## 目录结构

```
YiWeb/
├── cdn/                    # 共享组件库与工具
│   ├── components/         # Vue 组件（通用 + 业务）
│   ├── utils/              # 工具函数（视图、核心、UI）
│   ├── styles/             # 共享样式
│   ├── markdown/           # Markdown 渲染系统（插件化）
│   └── mermaid/            # Mermaid 图表渲染系统
├── src/
│   ├── core/               # 配置、服务、工具
│   │   ├── config.js       # 环境配置与端点管理
│   │   ├── services/       # API 服务层
│   │   └── utils/          # 核心工具
│   └── views/              # 视图应用
│       └── aicr/           # 代码审查页面（AICR）
│           ├── components/ # 页面级组件
│           ├── hooks/      # 状态管理与业务逻辑
│           ├── styles/     # 页面样式
│           └── utils/      # 页面工具函数
├── docs/                   # 项目文档
└── .claude/skills/         # Claude Code 技能系统
```

## 模块依赖关系

```
views/aicr/ ──→ cdn/components/
    │              │
    │              ├── common/  (YiButton, YiModal, YiLoading...)
    │              └── business/ (SearchHeader, MarkdownView, SkeletonLoader)
    │
    ├──→ cdn/utils/view/  (baseView, componentLoader, registry)
    ├──→ cdn/utils/core/  (api, http, error, log, storage...)
    ├──→ cdn/markdown/    (MarkdownRenderer + plugins)
    ├──→ cdn/mermaid/     (MermaidRenderer)
    └──→ src/core/        (config, services)
```

## 应用生命周期

```
index.html ──→ 加载 Vue CDN ──→ 加载 config.js ──→ 加载 index.js
                                    │
                                    ▼
                            createBaseView()
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              createStore()    useComputed()    useMethods()
                    │               │               │
                    └───────────────┴───────────────┘
                                    │
                                    ▼
                              注册全局组件
                                    │
                                    ▼
                              Vue.createApp().mount()
```

## 组件组织原则

### 通用组件（cdn/components/common/）

按功能分类存放：
- `buttons/` - YiButton, YiIconButton
- `forms/` - YiSelect
- `modals/` - YiModal
- `loaders/` - YiLoading
- `feedback/` - YiEmptyState, YiErrorState
- `tags/` - YiTag

### 业务组件（cdn/components/business/）

- `SearchHeader` - 搜索头部
- `MarkdownView` - Markdown 内容渲染
- `SkeletonLoader` - 骨架屏

### 页面组件（src/views/aicr/components/）

- `AicrPage` - 页面根容器
- `AicrHeader` - 页面头部
- `AicrSidebar` - 侧边栏
- `AicrCodeArea` - 代码展示区域
- `FileTree` - 文件树
- `CodeView` - 代码视图
- `AicrModals` - 模态框集合
- `KeyboardShortcutsHelp` - 快捷键帮助
- `AiModelSelector` - AI 模型选择器

## 文件命名约定

| 类型 | 命名风格 | 示例 |
|------|---------|------|
| 变量/函数 | camelCase | `createStore`, `fileTree` |
| 组件 | PascalCase | `AicrPage`, `YiButton` |
| 常量 | UPPER_SNAKE_CASE | `ENDPOINTS`, `ErrorTypes` |
| CSS 类 | kebab-case | `.aicr-sidebar`, `.yi-button` |
| 文件/目录 | camelCase / kebab-case | `baseView.js`, `file-tree/` |

## 模块导入约定

- 使用绝对路径，以 `/` 开头
- 示例：`import { createBaseView } from '/cdn/utils/view/baseView.js'`
- 示例：`import { config } from '/src/core/config.js'`

## 关键设计模式

### 1. 视图工厂模式

`cdn/utils/view/baseView.js` 提供统一的 `createBaseView()` 工厂函数，封装 Vue 应用创建、组件注册、插件加载、错误处理等通用逻辑。

### 2. Store 组合模式

`createStore()` 将状态分散到多个 ops 模块中组合：
- `storeState.js` - 定义响应式状态
- `storeSessionsOps.js` - 会话操作
- `storeFileTreeOps.js` - 文件树操作
- `storeFileContentOps.js` - 文件内容操作
- `storeUiOps.js` - UI 状态操作

### 3. 组件全局注册

通过 `registerGlobalComponent` 全局注册组件，支持模板缓存以提高性能。

### 4. Markdown 插件系统

`cdn/markdown/core/PluginSystem.js` 提供插件注册机制，支持 ContainersPlugin、AccordionPlugin、MermaidPlugin 等扩展。

## Postscript: Future Planning & Improvements

- 评估 cdn/components 组件去留（重构第二阶段）
- 考虑引入 Vitest 进行单元测试
- 评估是否需要构建工具以优化生产部署
