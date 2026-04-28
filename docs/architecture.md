# YiWeb 项目架构约定

> `.claude/` 下的 agents 和 rules 通过引用本文件获取项目特有约束。

## 目录组织

```
YiWeb/
├── src/                          # 源代码
│   ├── views/                    # 视图层
│   │   └── aicr/                 # AI 代码审查页面
│   │       ├── index.js          # 应用入口
│   │       ├── index.html        # 页面模板
│   │       ├── hooks/            # 状态和方法
│   │       ├── components/       # 页面组件
│   │       └── styles/           # 页面样式
│   └── core/                     # 核心服务
│       ├── services/             # 业务服务
│       └── config.js             # 配置文件
├── cdn/                          # CDN 资源
│   ├── components/               # Vue 组件库（被 AICR 使用）
│   │   ├── common/               # 通用组件
│   │   │   ├── buttons/          # YiButton, YiIconButton
│   │   │   ├── feedback/         # YiEmptyState, YiErrorState
│   │   │   ├── forms/            # YiInput, YiSelect, YiCheckbox, YiRadio, YiSwitch, YiForm, YiCalendar
│   │   │   ├── loaders/          # YiLoading
│   │   │   ├── modals/           # YiModal, YiDialog
│   │   │   ├── navigation/       # YiDropdown, YiPagination
│   │   │   ├── data-display/     # YiTable, YiTooltip, YiBadge
│   │   │   └── tags/             # YiTag
│   │   └── business/             # 业务组件
│   │       ├── MarkdownView/     # Markdown 视图组件
│   │       ├── SearchHeader/     # 搜索头部组件
│   │       └── SkeletonLoader/   # 骨架屏组件
│   ├── utils/                    # 工具函数
│   │   ├── core/                 # 核心工具（log, error, common等）
│   │   ├── view/                 # 视图工具（baseView, componentLoader）
│   │   ├── ui/                   # UI 工具
│   │   ├── browser/              # 浏览器工具
│   │   ├── time/                 # 时间工具
│   │   └── render/               # 渲染工具
│   ├── styles/                   # 样式文件
│   │   ├── base/                 # 基础样式
│   │   ├── components/           # 组件样式
│   │   └── utils.css             # 工具样式
│   ├── markdown/                 # Markdown 处理（核心系统）
│   │   ├── core/                 # 核心渲染器
│   │   └── plugins/              # 插件系统
│   └── mermaid/                  # Mermaid 图表处理（核心系统）
│       ├── core/                 # 核心渲染器
│       └── plugins/              # 插件系统
├── docs/                         # 文档目录
│   └── 重构cdn目录/             # cdn 重构相关文档
├── .claude/                      # Claude 配置
├── index.html                    # 根页面
└── CLAUDE.md                     # Claude 配置
```

### cdn 目录重构状态

**当前阶段**：第一阶段完成（文档完善）

- 完整文档：`docs/重构cdn目录/`
- 核心系统：markdown 和 mermaid 保持不变
- 组件库：待评估去留（AICR 正在使用）

**详细信息**：参见 `docs/重构cdn目录/`

## 放置规则

| 类型 | 存放位置 | 判断标准 |
|------|---------|---------|
| 共享组件 | `cdn/components/` | 多个视图使用的通用组件 |
| 业务组件 | `cdn/components/business/` 或 `src/views/{view}/components/` | 单个视图专用的组件放在视图目录 |
| 工具函数 | `cdn/utils/` | 通用工具函数 |
| 状态管理 | `src/views/{view}/hooks/` | 视图专用的 Store、Computed、Methods |
| 样式文件 | `cdn/styles/` 或 `src/views/{view}/styles/` | 通用样式放在 cdn，视图专用样式放在视图目录 |
| 文档 | `docs/` | 项目文档 |

**禁止**：
- 禁止在组件中硬编码环境配置（应从 `src/core/config.js` 读取）
- 禁止修改与当前任务无关的文件
- 禁止重构没有问题的代码
- 禁止使用 npm/yarn 安装依赖（本项目无需构建工具）

## 核心架构模式

### 1. 视图工厂：createBaseView

**用途**：统一创建和挂载 Vue 应用。

**代码示例**（来自 `cdn/utils/view/baseView.js`）：

```javascript
// 创建视图应用
const app = await createBaseView({
    createStore: () => store,
    useComputed,
    useMethods,
    components: ['AicrPage', 'YiButton', ...],
    componentModules: ['/src/views/aicr/components/aicrPage/index.js', ...],
    data: { ... },
    onMounted: (mountedApp) => { ... },
    props: { ... },
    methods: { ... },
    computed: { ... }
});
```

**职责划分**：
| 文件 | 职责 |
|------|------|
| `cdn/utils/view/baseView.js` | 提供 `createBaseView` 工厂函数 |
| `src/views/{view}/index.js` | 视图入口，调用 `createBaseView` |
| `src/views/{view}/hooks/store.js` | 创建 Store |
| `src/views/{view}/hooks/useComputed.js` | 定义计算属性 |
| `src/views/{view}/hooks/useMethods.js` | 定义方法 |

### 2. 状态管理：createStore + useComputed + useMethods

**用途**：管理视图的响应式状态、计算属性和方法。

**结构**：

```
src/views/aicr/hooks/
├── store.js                  # Store 入口（导出 createStore）
├── state/
│   └── storeFactory.js       # Store 工厂
├── computed/
│   └── useComputed.js        # 计算属性
├── methods/
│   ├── sessionMethods.js     # 会话方法
│   ├── fileTreeMethods.js    # 文件树方法
│   ├── chatMethods.js        # 聊天方法
│   └── ...
└── useMethods.js             # 方法组合
```

**示例**（来自 `src/views/aicr/hooks/store.js`）：

```javascript
export { buildFileTreeFromSessions } from '../storeFileTreeBuilders.js';
export { getFileDeleteService } from '../fileDeleteService.js';
export { createStore } from './state/storeFactory.js';
```

### 3. 组件加载：registerGlobalComponent + defineComponent

**用途**：异步加载 Vue 组件，支持模板缓存。

**代码示例**（来自 `cdn/utils/view/componentLoader.js`）：

```javascript
// 注册全局组件
registerGlobalComponent({
    name: 'YiButton',
    css: '/cdn/components/common/buttons/YiButton/index.css',
    html: '/cdn/components/common/buttons/YiButton/template.html',
    component: {
        props: { ... },
        setup() { ... }
    }
}, {
    exposeName: 'YiButton',
    eventName: 'YiButtonLoaded'
});
```

**组件目录结构**：

```
cdn/components/common/buttons/YiButton/
├── index.js            # 组件定义
├── index.css           # 组件样式
└── template.html       # 组件模板
```

### 4. 模块导入：绝对路径 + ES Modules

**导入规则**：
- 使用绝对路径，以 `/` 开头
- 从 `cdn/` 导入共享资源
- 从 `src/` 导入视图专用资源

**示例**：

```javascript
import { logInfo } from '/cdn/utils/core/log.js';
import { createBaseView } from '/cdn/utils/view/baseView.js';
import { createStore } from '/src/views/aicr/hooks/store.js';
```

### 5. 错误处理：safeExecute + 错误过滤器

**用途**：统一处理错误，过滤浏览器扩展错误。

**代码示例**（来自 `cdn/utils/core/error.js`）：

```javascript
// 安全执行函数
safeExecute(() => {
    // 代码
}, '上下文', (errorInfo) => {
    // 错误处理
});

// 启用浏览器扩展错误过滤
setupBrowserExtensionErrorFilter('App');
```

## src/views/aicr 应用结构

```
src/views/aicr/
├── index.js                      # 应用入口
├── index.html                    # 页面模板
├── hooks/
│   ├── store.js                  # Store 入口
│   ├── state/
│   │   └── storeFactory.js       # Store 工厂
│   ├── computed/
│   │   └── useComputed.js        # 计算属性
│   ├── methods/
│   │   ├── sessionMethods.js     # 会话方法
│   │   ├── fileTreeMethods.js    # 文件树方法
│   │   ├── chatMethods.js        # 聊天方法
│   │   ├── uiMethods.js          # UI 方法
│   │   └── ...
│   ├── useMethods.js             # 方法组合
│   └── ...                       # 其他 hooks
├── components/
│   ├── aicrPage/                 # 主页面组件
│   ├── aicrHeader/               # 头部组件
│   ├── aicrSidebar/              # 侧边栏组件
│   ├── aicrCodeArea/             # 代码区域组件
│   ├── fileTree/                 # 文件树组件
│   └── ...
└── styles/
    ├── index.css                 # 主样式
    ├── layout.css                # 布局样式
    └── ...
```

## 编码规范

### 语法

- 使用 ES6+ 语法
- 优先使用 `const`，需要重新赋值时使用 `let`
- 禁止使用 `var`
- 使用箭头函数
- 使用 `async/await` 处理异步
- 缩进使用 4 空格

### 命名

- 变量和函数：camelCase（如 `loadSessions`、`activeSession`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_ERRORS`）
- Vue 组件：PascalCase（如 `YiButton`、`AicrPage`）
- 组件文件名：kebab-case 或 PascalCase
- CSS 类名：kebab-case（如 `aicr-sidebar`）
- 私有函数：以下划线 `_` 开头（如 `_internalHelper`）

### Vue 3 API 风格

- 使用 Composition API（`setup` 函数）
- 使用 `ref` 和 `reactive` 创建响应式数据
- 使用 `computed` 创建计算属性
- 组件注册：`app.component(name, component)`
- 事件：`$emit` + CustomEvent

### 注释与文件组织

- 文件顶部添加 JSDoc 注释（作者、用途）
- 复杂函数添加注释说明用途和参数
- 按功能分组组织代码
- 导出优先使用命名导出，默认导出作为补充

## 实施顺序

1. 创建视图目录结构（`src/views/{view}/`）
2. 定义 Store 工厂（`hooks/state/storeFactory.js`）
3. 定义计算属性（`hooks/computed/useComputed.js`）
4. 定义方法（`hooks/methods/`）
5. 创建组件（`components/`）
6. 创建视图入口（`index.js` + `index.html`）
7. 测试和调试

> 待补充（原因：更多实施细节需要根据具体功能补充）
