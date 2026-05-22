> | v1.0.0 | 2026-05-22 | deepseek-v4-pro | 🌿 feat/aicr | ⏱️ — | 📎 [CLAUDE.md](../../../CLAUDE.md) |

> **导航**: [← YiWeb-使用场景](./YiWeb-使用场景.md) · [YiWeb-测试设计 →](./YiWeb-测试设计.md) · [YiWeb-安全审计 →](./YiWeb-安全审计.md)

> **来源引用**: 从 `src/views/aicr/` 源码只读分析生成，证据 Level B + 源码路径。

[§0 基线溯源](#sec0-baseline) · [§1 架构概览](#sec1-arch) · [§2 组件树](#sec2-components) · [§3 状态管理](#sec3-state) · [§4 数据流](#sec4-dataflow) · [§5 交互流程](#sec5-interaction)

---

### 主要价值

- 🎯 全链路请求流可视化 — 从用户点击到 AI 响应的完整路径
- 🔒 状态管理透明 — store 50+ 状态字段全部枚举
- ⚡ 组件依赖清晰 — 29 个组件 + 40 个 hook 模块的依赖图
- 📊 证据可追溯 — 每个断言附源码行号

---

<a id="sec0-baseline"></a>

## §0 基线溯源

| 溯源目标 | 本文档章节 |
|---------|-----------|
| FP1: 会话列表 | §4 数据流（会话加载链路） |
| FP6: 文件树 | §3 状态管理（文件树状态） |
| FP8: 流式对话 | §4 数据流（流式请求链路）+ §5 交互流程 |
| Story 1–5 | §1 架构概览 + §2 组件树 |

---

<a id="sec1-arch"></a>

## §1 架构概览

```mermaid
flowchart TB
    subgraph 入口["入口 (index.js:16)"]
        INIT["initAicrApp()"]
    end

    subgraph 核心["createBaseView 三件套"]
        STORE["createStore()<br/>50+ 响应式状态"]:::hub
        COMPUTED["useComputed()<br/>派生计算属性"]:::leaf
        METHODS["useMethods()<br/>40+ hook 模块聚合"]:::hub
    end

    subgraph 组件层["29 个组件"]
        PAGE["AicrPage<br/>根布局"]
        HEADER["AicrHeader<br/>搜索+操作"]
        SIDEBAR["AicrSidebar<br/>会话列表+文件树"]
        CODE["AicrCodeArea<br/>代码+聊天面板"]
        MODALS["AicrModals<br/>弹窗集合"]
    end

    subgraph 数据层["数据源"]
        API["远端 API<br/>api.effiy.cn"]
        LOCAL["localStorage<br/>Token+设置"]
        CACHE["内存缓存<br/>Map"]
    end

    INIT --> STORE
    STORE --> COMPUTED
    METHODS --> STORE
    PAGE --> HEADER & SIDEBAR & CODE & MODALS
    METHODS --> API
    STORE <--> LOCAL

    classDef hub fill:#ffebee,stroke:#c62828;
    classDef leaf fill:#e8f5e9,stroke:#2e7d32;
```

> 证据: `src/views/aicr/index.js:19–131`

---

<a id="sec2-components"></a>

## §2 组件树

```mermaid
flowchart TD
    AICR_PAGE["AicrPage"] --> HEADER["AicrHeader<br/>SearchHeader + HeaderActions"]
    AICR_PAGE --> SIDEBAR["AicrSidebar<br/>会话列表 + FileTree"]
    AICR_PAGE --> CODE_AREA["AicrCodeArea<br/>CodeView/MarkdownView + 聊天面板"]
    AICR_PAGE --> MODALS["AicrModals<br/>弹窗集合"]

    HEADER --> SEARCH["SearchHeader"]
    HEADER --> ACTIONS["HeaderActions"]
    HEADER --> MODEL_SEL["AiModelSelector"]

    SIDEBAR --> FILE_TREE["FileTree"]
    SIDEBAR --> SESSION_LIST["会话列表"]

    CODE_AREA --> CODE_VIEW["CodeView"]
    CODE_AREA --> MARKDOWN_VIEW["MarkdownView"]
    CODE_AREA --> CHAT_PANEL["聊天面板"]

    MODALS --> YI_MODAL["YiModal"]
    MODALS --> SESSION_EDIT["会话编辑弹窗"]
    MODALS --> AUTH_DIALOG["认证弹窗"]
    MODALS --> SHORTCUTS["KeyboardShortcutsHelp"]
```

| 组件 | 来源 | 职责 |
|------|------|------|
| AicrPage | `src/views/aicr/components/aicrPage/` | 四栏根布局 |
| AicrHeader | `src/views/aicr/components/aicrHeader/` | 顶部搜索+操作栏 |
| AicrSidebar | `src/views/aicr/components/aicrSidebar/` | 左侧边栏容器 |
| AicrCodeArea | `src/views/aicr/components/aicrCodeArea/` | 中间代码+右侧聊天 |
| AicrModals | `src/views/aicr/components/aicrModals/` | 弹窗集中管理 |
| FileTree | `src/views/aicr/components/fileTree/` | 文件树渲染 |
| CodeView | `src/views/aicr/components/codeView/` | 代码语法高亮展示 |
| AiModelSelector | `src/views/aicr/components/AiModelSelector/` | AI 模型下拉选择 |

---

<a id="sec3-state"></a>

## §3 状态管理

> 证据: `src/views/aicr/index.js:79–131` data 字段 + `hooks/state/storeState.js`

### 状态分类

| 类别 | 状态字段 | 数量 |
|------|---------|:--:|
| 布局 | sidebarCollapsed, sidebarWidth, chatPanelCollapsed, chatPanelWidth, viewMode | 5 |
| 搜索 | searchQuery, sessionSearchQuery | 2 |
| 会话列表 | sessions, sessionLoading, sessionError, selectedSessionTags | 4 |
| 会话操作 | batchMode, selectedKeys, sessionBatchMode, selectedSessionKeys, externalSelectedSessionKey | 5 |
| 活跃会话 | activeSession, activeSessionLoading, activeSessionError | 3 |
| 聊天 | sessionChatInput, sessionChatSending, sessionContext*, sessionMessageEditor* | 10 |
| 文件树 | (storeFileTreeOps 管理) | — |
| 标签 | tagFilterNoTags | 1 |
| 模型 | availableModels, modelsLoading, modelsError | 3 |
| 编辑 | sessionEdit* | 5 |

### Store 模块架构

```
hooks/store.js → hooks/state/store.js → hooks/state/storeFactory.js
                                       → hooks/state/storeState.js

40+ hook 模块按职责划分:
  hooks/sessionListMethods.js       (833 行) — 会话列表
  hooks/sessionChatContextMethods.js (728 行) — 聊天上下文
  hooks/projectZipMethods.js        (708 行) — 项目导入
  hooks/tagManagerMethods.js        (782 行) — 标签管理
  hooks/storeFileTreeOps.js         (698 行) — 文件树操作
  hooks/sessionFaqMethods.js        (665 行) — FAQ
  ...
```

---

<a id="sec4-dataflow"></a>

## §4 数据流

### 会话加载链路

```mermaid
flowchart LR
    MOUNT["onMounted"] --> LOAD["store.loadSessions()"]
    LOAD --> API["crud.queryDocuments('sessions')"]
    API --> CACHE["写入内存缓存"]
    CACHE --> STATE["store.sessions = data"]
    STATE --> RENDER["组件重渲染"]
```

> 证据: `src/views/aicr/index.js:132–175` + `hooks/sessionListMethods.js`

### 流式请求链路

```mermaid
flowchart LR
    SEND["用户发送消息"] --> POST["crudStream(url, data, callbacks)"]
    POST --> FETCH["fetch POST"]
    FETCH --> STREAM["ReadableStream"]
    STREAM --> CHUNK["onChunk(chunk)"]
    CHUNK --> PARSE["JSON.parse"]
    PARSE --> APPEND["追加到消息列表"]
    APPEND --> SCROLL["滚动到底部"]
    STREAM --> DONE["onDone()"]
    DONE --> FINAL["结束发送状态"]
    STREAM --> ERR["onError(err)"]
    ERR --> SHOW["显示错误"]
```

> 证据: `hooks/sessionChatContextChatMethods.streaming.js`

---

<a id="sec5-interaction"></a>

## §5 交互流程

### 会话切换

```mermaid
flowchart LR
    CLICK["点击会话"] --> SELECT["selectSession(key)"]
    SELECT --> CLEAR["清理前一会话聊天状态"]
    CLEAR --> LOAD_MSGS["加载历史消息"]
    LOAD_MSGS --> LOAD_FILES["加载文件树"]
    LOAD_FILES --> ACTIVE["activeSession 更新"]
    ACTIVE --> RENDER["聊天面板+文件树渲染"]
```

### 批量删除

```mermaid
flowchart LR
    TOGGLE["开启批量模式"] --> CHECK["勾选多个会话"]
    CHECK --> BTN["点击批量删除"]
    BTN --> CONFIRM["确认弹窗"]
    CONFIRM -->|"确认"| DEL["逐个调用 deleteRequest"]
    DEL --> REFRESH["刷新列表"]
    CONFIRM -->|"取消"| CANCEL["关闭弹窗"]
```

---

> **变更记录**
> | 日期 | 变更 | 触发 | 证据 |
> |------|------|------|------|
> | 2026-05-22 | 初始生成 — 源码只读分析 | /rui doc --from-code aicr | src/views/aicr/ |
