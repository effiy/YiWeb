> | v1 | 2026-05-19 | deepseek-v4-pro | 🌿 feat/cdn-components |

> **来源引用**: 从 `cdn/components/business/MarkdownView/` 和 `cdn/components/business/SkeletonLoader/` 源码反推。证据等级 B。

---

### §1 用户场景总览

```mermaid
flowchart TD
    subgraph markdown["MarkdownView 场景"]
        M1["📄 静态渲染<br/>文档/消息预览"]:::scene
        M2["⚡ 流式渲染<br/>AI 实时回复"]:::scene
        M3["📑 TOC 生成<br/>长文档导航"]:::scene
    end

    subgraph skeleton["SkeletonLoader 场景"]
        S1["🌲 文件树加载<br/>首次进入页面"]:::scene
        S2["📝 代码视图加载<br/>切换文件"]:::scene
        S3["💬 聊天面板加载<br/>切换会话"]:::scene
    end

    classDef scene fill:#e3f2fd,stroke:#1565c0;
```

---

### §2 MarkdownView 用户场景

#### 场景 1：渲染聊天消息

```mermaid
flowchart LR
    A["AI 返回 Markdown 消息"] --> B["MarkdownView<br/>mode='markdown'"]
    B --> C["SanitizePlugin 消毒"]
    C --> D["MermaidPlugin 渲染图表"]
    D --> E["GFM 表格/任务列表"]
    E --> F["输出安全 HTML"]
```

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | AI 返回含代码块/表格/链接的 Markdown | 消息通过 MarkdownView 渲染 |
| 2 | mode='markdown'（默认） | 调用 renderMarkdownHtml，启用 GFM |
| 3 | 内容含 Mermaid 代码块 | MermaidPlugin 渲染为 SVG 图表 |
| 4 | 内容含 HTML 标签 | SanitizePlugin 过滤危险标签 |

#### 场景 2：流式渲染 AI 回复

```mermaid
flowchart LR
    A["SSE token 到达"] --> B["content 追加"]
    B --> C["MarkdownView<br/>mode='streaming'"]
    C --> D["renderStreamingHtml"]
    D --> E["增量 DOM 更新"]
```

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | AI 开始流式返回 | mode='streaming' 激活 |
| 2 | content prop 每收到新 token 更新 | 仅增量部分重新渲染 |
| 3 | 流式完成 | 最终内容与静态渲染一致 |

#### 场景 3：预览 Markdown 文档

```mermaid
flowchart LR
    A["选中 .md 文件"] --> B["codeView 加载内容"]
    B --> C["MarkdownView<br/>:show-toc='true'"]
    C --> D["渲染文档 + TOC"]
```

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 用户在文件树选中 .md 文件 | codeView 获取文件内容 |
| 2 | MarkdownView 渲染，showToc=true | 显示目录导航 |
| 3 | 文档含 GFM 表格/任务列表 | gfm=true 正确渲染 |

---

### §3 SkeletonLoader 用户场景

#### 场景 4：文件树首次加载

```mermaid
flowchart TD
    A["页面加载"] --> B{"fileTree loading=true?"}
    B -->|"是"| C["SkeletonLoader<br/>variant='file-tree'"]
    C --> D["显示搜索框 + N 个树项骨架"]
    B -->|"否"| E["显示实际文件树"]
    D --> F["数据到达"] --> E
```

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 页面初始化，文件树数据未就绪 | loading=true |
| 2 | SkeletonLoader 渲染 file-tree 变体 | 搜索框骨架 + 10 个树项（随机缩进/宽度） |
| 3 | 文件树数据加载完成 | loading=false，骨架屏替换为真实文件树 |

#### 场景 5：代码视图加载

```mermaid
flowchart TD
    A["选中文件"] --> B{"codeView loading=true?"}
    B -->|"是"| C["SkeletonLoader<br/>variant='code-view'"]
    C --> D["代码头部 + 工具栏 + N 行代码骨架"]
    B -->|"否"| E["显示代码内容"]
    D --> F["文件内容到达"] --> E
```

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 用户点击文件名 | 触发文件内容加载 |
| 2 | 加载期间 SkeletonLoader 渲染 code-view 变体 | 文件名栏 + 工具栏 + 25 行代码骨架（行号 + 随机宽度内容） |
| 3 | 文件内容返回 | 骨架屏替换为语法高亮代码 |

#### 场景 6：切换会话聊天面板

```mermaid
flowchart TD
    A["切换会话"] --> B{"聊天面板加载中?"}
    B -->|"是"| C["SkeletonLoader<br/>variant='chat-panel'"]
    C --> D["消息列表 + 输入框骨架"]
    B -->|"否"| E["显示聊天消息"]
    D --> F["会话数据加载完成"] --> E
```

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 用户点击会话标签 | 触发会话加载 |
| 2 | 加载期间 SkeletonLoader 渲染 chat-panel 变体 | 标题 + 用户/助手消息骨架（交替布局）+ 输入框骨架 |
| 3 | 会话消息加载完成 | 骨架屏替换为实际消息列表 |
