> | v1 | 2026-05-19 | deepseek-v4-pro | 🌿 feat/cdn-components |

> **来源引用**: 从 `cdn/components/business/MarkdownView/index.js`、`cdn/components/business/SkeletonLoader/` 源码反推。证据等级 B。

---

### §1 组件架构

#### §1.1 组件层级

```mermaid
flowchart TB
    subgraph cdn["cdn/components/business/"]
        MV["MarkdownView<br/>Markdown 渲染组件"]:::comp
        SL["SkeletonLoader<br/>骨架屏加载组件"]:::comp
    end

    subgraph renderer["cdn/markdown/"]
        CORE["MarkdownRenderer<br/>核心渲染引擎"]:::core
        PLUGINS["10 插件管线<br/>Containers/Accordion/Frontmatter<br/>Toc/InternalLink/Sanitize<br/>Mermaid/TableCellMarkdown<br/>NestedMarkdown"]:::plugin
    end

    MV -->|"renderMarkdownHtml()"| CORE
    MV -->|"renderStreamingHtml()"| CORE
    CORE --> PLUGINS

    classDef comp fill:#e3f2fd,stroke:#1565c0;
    classDef core fill:#fff3e0,stroke:#e65100;
    classDef plugin fill:#f3e5f5,stroke:#6a1b9a;
```

#### §1.2 组件清单

| 组件 | 类型 | 文件数 | 来源 |
|------|------|:------:|------|
| MarkdownView | CDN 业务组件 | 1 (`index.js`) | `/cdn/components/business/MarkdownView/` |
| SkeletonLoader | CDN 业务组件 | 3 (`index.js` + `template.html` + `index.css`) | `/cdn/components/business/SkeletonLoader/` |

---

### §2 MarkdownView 接口

#### §2.1 Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| content | String\|Number\|Object\|Array | `''` | Markdown 原始内容，null 自动转空字符串 |
| mode | String | `'markdown'` | 渲染模式：`'markdown'`（静态）或 `'streaming'`（流式） |
| breaks | Boolean | `true` | 单换行是否转换为 `<br>` |
| gfm | Boolean | `true` | 是否启用 GitHub Flavored Markdown |
| showToc | Boolean | `false` | 是否显示目录（当前未在 template 中实现，通过 prop 传递） |

#### §2.2 Computed

| Computed | 依赖 | 返回 | 说明 |
|----------|------|------|------|
| rawContent | content | String | 将 content 安全转为字符串，null → `''` |
| renderedHtml | rawContent, mode, breaks, gfm | String | 根据 mode 选择 renderMarkdownHtml 或 renderStreamingHtml |

#### §2.3 渲染策略

```mermaid
flowchart TD
    CONTENT["content prop"] --> RAW["rawContent: String(content)"]
    RAW --> EMPTY{"rawContent 为空?"}
    EMPTY -->|"是"| RET["返回 ''"]
    EMPTY -->|"否"| MODE{"mode === 'streaming'?"}
    MODE -->|"是"| STREAM["renderStreamingHtml(raw)"]
    MODE -->|"否"| STATIC["renderMarkdownHtml(raw, {breaks, gfm})"]
    STREAM --> OUT["输出 HTML"]
    STATIC --> OUT
```

#### §2.4 Template

```html
<div class="md-view">
    <div v-html="renderedHtml"></div>
</div>
```

内联模板，无外部 HTML/CSS 文件。通过 `v-html` 直接输出渲染结果。

#### §2.5 使用位置

| 父组件 | 用途 | mode | 特殊配置 |
|--------|------|------|---------|
| aicrModals | 会话上下文预览 | markdown | — |
| aicrModals | 消息编辑器预览 | markdown | — |
| aicrCodeArea | 聊天消息渲染 | markdown / streaming | 流式消息使用 streaming 模式 |
| codeView | Markdown 文件预览 | markdown | showToc=true |

---

### §3 SkeletonLoader 接口

#### §3.1 组件注册

```js
registerGlobalComponent({
    name: 'SkeletonLoader',
    html: '/cdn/components/business/SkeletonLoader/template.html',
    css: '/cdn/components/business/SkeletonLoader/index.css',
    props: {},
    emits: []
});
```

组件为空 Props 声明，所有属性通过 HTML attribute 自动绑定。

#### §3.2 隐式 Props（通过 Template 使用推断）

| Prop | 类型 | 说明 | 使用位置 |
|------|------|------|---------|
| variant | String | 骨架屏变体：`'file-tree'` / `'code-view'` / `'chat-panel'` | 根元素 `:class` |
| visible | Boolean | 是否显示骨架屏 | 根元素 `v-if` |
| itemCount | Number | file-tree 变体的骨架项数量 | `v-for="i in itemCount"` |
| lineCount | Number | code-view 变体的代码行数量 | `v-for="i in lineCount"` |
| messageCount | Number | chat-panel 变体的消息数量 | `v-for="i in messageCount"` |

#### §3.3 三种变体布局

```mermaid
flowchart TB
    ROOT["&lt;div v-if='visible' :class='variant'&gt;"] --> V{"variant?"}
    V -->|"file-tree"| FT["搜索框骨架<br/>+ N 个树项<br/>(图标 + 文本, 随机缩进/宽度)"]
    V -->|"code-view"| CV["代码头部(文件名+按钮)<br/>工具栏(搜索+按钮)<br/>+ N 行代码(行号+内容)"]
    V -->|"chat-panel"| CP["聊天头部(标题+按钮)<br/>N 条消息(头像+气泡)<br/>输入框+发送按钮"]
    V -->|"其他"| EMPTY["不渲染任何内容"]
```

#### §3.4 随机宽度算法

骨架屏使用随机值模拟真实内容的不规则性，方法由组件框架的 methods 提供（非 props）：

- `getRandomWidth()` — 返回 30–90% 的随机宽度
- `getRandomIndent()` — 返回 0–40px 的随机缩进（file-tree 变体）
- `getRandomLineWidth()` — 返回 40–100% 的随机宽度（code-view 变体）
- `getRandomMessageLines()` — 返回 2–5 的随机行数（chat-panel 变体）

#### §3.5 使用位置

| 父组件 | variant | Props |
|--------|---------|-------|
| codeView | code-view | `:line-count="25"` |
| fileTree | file-tree | `:item-count="10"` |

---

### §4 数据流

```mermaid
flowchart LR
    subgraph parent["父组件 (aicr)"]
        DATA["数据状态"]:::state
        LOADING["loading ref"]:::state
    end

    subgraph skeleton["SkeletonLoader"]
        VIS["v-if='visible'"]:::logic
        VAR["variant 分支"]:::logic
        DOM["骨架屏 DOM"]:::render
    end

    subgraph markdown["MarkdownView"]
        RAW["rawContent"]:::logic
        RENDER["renderedHtml"]:::logic
        HTML["v-html 输出"]:::render
    end

    DATA -->|"content prop"| RAW
    LOADING -->|"visible"| VIS
    VIS --> VAR --> DOM
    RAW --> RENDER --> HTML

    classDef state fill:#e8f5e9,stroke:#2e7d32;
    classDef logic fill:#fff3e0,stroke:#e65100;
    classDef render fill:#e3f2fd,stroke:#1565c0;
```

---

| 日期 | 变更 | 触发 | 证据 |
|------|------|------|------|
| 2026-05-19 | 初始文档生成 | `/rui doc --from-code cdn/components/business/` | 源码反推，Level B |
