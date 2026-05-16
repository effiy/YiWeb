# YiWeb

> AI 辅助的代码审查与协作平台。零构建、纯 ESM、浏览器原生运行。

## 系统视图

```mermaid
flowchart TB
    subgraph Browser["浏览器"]
        subgraph View["视图层 src/views/aicr/"]
            UI["组件树（HTML+CSS+JS）"]
            Hooks["Hooks（computed / methods / state）"]
        end
        subgraph Core["服务层 src/core/"]
            Config["config.js"]
            Services["services/（API / CRUD / 认证 / 业务流）"]
        end
        subgraph CDN["CDN 组件库"]
            Comp["通用组件"]
            Utils["工具库（日志 / 事件 / DOM / 渲染）"]
            MD["Markdown + Mermaid 渲染器"]
        end
    end
    subgraph Backend["后端服务"]
        API["api.effiy.cn"]
        Data["data.effiy.cn"]
        Ollama["ollama.effiy.cn"]
    end
    UI <--> Hooks
    Hooks <--> Services
    Services <--> Config
    Services <--> API
    Services <--> Data
    Services <--> Ollama
    UI <--> Comp
    Hooks <--> Utils
    UI <--> MD
```

## 命令流

```mermaid
flowchart LR
    A["用户操作"] --> B["视图组件事件"]
    B --> C["methods 处理"]
    C --> D["store mutation"]
    D --> E["computed 重算"]
    E --> F["DOM 更新"]
    C --> G["services API 调用"]
    G --> H["后端响应"]
    H --> D
```

## 快速开始

1. 本地启动任意静态文件服务器（如 `npx serve .` 或 Python `http.server`）
2. 打开 `http://localhost:3000`（或对应端口）
3. 默认连接 `prod` 环境；如需切换：
   - URL 参数：`?env=local`
   - 或执行 `localStorage.setItem('env', 'local'); location.reload()`
4. 首次使用需在登录弹窗中输入 API Token

## 项目结构

```
YiWeb/
├── cdn/                          # CDN 托管的通用组件与工具
│   ├── components/               # YiModal, YiButton, YiLoading 等
│   ├── markdown/                 # MarkdownRenderer + 插件系统
│   ├── mermaid/                  # MermaidRenderer + 交互插件
│   └── utils/                    # 日志、DOM、事件、验证、存储等
├── src/
│   ├── core/
│   │   ├── config.js             # 环境配置（local/prod）
│   │   └── services/
│   │       ├── index.js          # 服务聚合导出
│   │       ├── aicr/             # AICR 专用服务
│   │       ├── business/         # 业务流程/场景分析器
│   │       ├── helper/           # API 请求、认证、错误处理
│   │       └── modules/          # CRUD、 goals 等通用模块
│   └── views/
│       └── aicr/                 # AI 代码审查视图（当前唯一视图）
│           ├── components/         # 业务组件
│           ├── hooks/              # computed / methods / state / store
│           ├── styles/             # 视图级样式
│           ├── utils/              # 视图工具（resizer、listenerManager）
│           ├── constants/          # 常量
│           ├── index.html          # 视图模板
│           └── index.js            # 视图入口
├── docs/故事任务面板/              # rui 故事文档
├── index.html                    # 根入口（当前仅占位）
└── CLAUDE.md                     # 项目画像与执行准则
```

## 领域语言

| 术语 | 定义 | 关系 |
|------|------|------|
| **AICR** | AI Code Review 的缩写，YiWeb 的核心业务视图 | 承载会话、文件树、代码查看、AI 聊天 |
| **createBaseView** | 自研视图框架函数，注册 store、computed、methods、组件列表 | 每个视图必须调用；语义类似 Vue 的 `createApp` |
| **vueRef** | 响应式引用实现，用于 store state | 被 `createBaseView` 消费；变更触发 computed 重算 |
| **session** | AICR 中的 AI 对话会话，包含多轮消息 | 与 fileTree 关联；可搜索、可打标签 |
| **fileTree** | 项目文件树结构，支持懒加载、展开、选中、批量操作 | 被 session 引用以定位代码上下文 |
| **streamPrompt** | 向后端发起 SSE 流式请求，用于 AI 聊天响应 | CRUD 模块提供；methods 层消费并驱动 UI 增量更新 |

### 示例对话

- "在 AICR 的 fileTree 中新增一个批量重命名功能"
- "session 的流式输出需要支持中断，请修改 streamPrompt 的 AbortController 逻辑"
- "createBaseView 的 computed 没有正确响应 vueRef 变更，检查依赖收集"

### 歧义标记

- "视图" 可能指浏览器页面（`index.html`）或 `createBaseView` 实例 — 需结合上下文区分
- "组件" 可能指 `cdn/components/` 通用组件或 `src/views/aicr/components/` 业务组件 — 默认指通用组件，业务组件需加前缀
