> | v1 | 2026-05-19 | deepseek-v4-pro | 🌿 feat/cdn-components |

> **来源引用**: 从 `cdn/components/business/MarkdownView/` 和 `cdn/components/business/SkeletonLoader/` 源码反推。证据等级 B。

---

### §1 测试范围

覆盖 MarkdownView（3 Props 组合 × 2 模式）和 SkeletonLoader（3 变体 × 边界条件）。

---

### §2 测试用例

#### MarkdownView

| TC# | 类型 | Given | When | Then | 关联 AC# |
|-----|------|-------|------|------|----------|
| MV-01 | 正常 | content=`"# Hello\n\n**bold**"` | mode='markdown' | 渲染为 `<h1>Hello</h1><p><strong>bold</strong></p>` | AC1 |
| MV-02 | 正常 | content=`"line1\nline2"`, breaks=true | mode='markdown' | line1 后跟 `<br>`，line2 在下一行 | AC1 |
| MV-03 | 正常 | content=`"|a|b|\n|--|--|\n|1|2|"`, gfm=true | mode='markdown' | 渲染为 HTML 表格 | AC1 |
| MV-04 | 正常 | content=`"- [x] done\n- [ ] todo"`, gfm=true | mode='markdown' | 渲染为勾选/未勾选的任务列表 | AC1 |
| MV-05 | 正常 | content=流式追加 token | mode='streaming' | 每次更新仅增量渲染 | AC2 |
| MV-06 | 正常 | content 含 Mermaid 代码块 | mode='markdown' | 渲染为 SVG 图表 | AC1 |
| MV-07 | 边界 | content=`''` | mode='markdown' | renderedHtml 返回 `''` | AC3 |
| MV-08 | 边界 | content=`null` | mode='markdown' | rawContent 转为 `''`，不报错 | AC3 |
| MV-09 | 边界 | content=`0`（数字 0） | mode='markdown' | 渲染字符串 `"0"`，不报错 | AC1 |
| MV-10 | 边界 | content 含 `<script>alert(1)</script>` | mode='markdown' | SanitizePlugin 移除 script 标签 | — |
| MV-11 | 错误 | mode 为任意非 'streaming' 值 | 组件渲染 | 走 renderMarkdownHtml 分支，不报错 | — |

#### SkeletonLoader

| TC# | 类型 | Given | When | Then | 关联 AC# |
|-----|------|-------|------|------|----------|
| SL-01 | 正常 | variant='file-tree', itemCount=10 | 组件挂载 | 显示 10 个 `.skeleton-tree-item` | AC4 |
| SL-02 | 正常 | variant='code-view', lineCount=25 | 组件挂载 | 显示 25 个 `.skeleton-code-line` | AC5 |
| SL-03 | 正常 | variant='chat-panel', messageCount=5 | 组件挂载 | 显示 5 个 `.skeleton-message` | AC6 |
| SL-04 | 正常 | visible=true | 组件挂载 | 骨架屏可见 | AC4 |
| SL-05 | 边界 | visible=false | 组件挂载 | 骨架屏不渲染（v-if 隐藏） | — |
| SL-06 | 边界 | variant 为未定义值 | 组件挂载 | 显示空白 `.skeleton-loader` 容器，无报错 | AC7 |
| SL-07 | 边界 | itemCount=0（file-tree） | 组件挂载 | 0 个树项，仅搜索框骨架 | — |
| SL-08 | 边界 | lineCount=0（code-view） | 组件挂载 | 0 行代码，仅头部+工具栏 | — |
| SL-09 | 随机 | variant='file-tree', itemCount=100 | 检查各树项 | 每个树项的缩进/宽度在合理范围内不重复（随机性验证） | — |

---

### §3 Gate A 映射

| AC# | 关联 TC# | P0? |
|-----|----------|:---:|
| AC1 | MV-01, MV-02, MV-03, MV-04, MV-06 | ✅ |
| AC2 | MV-05 | — |
| AC3 | MV-07, MV-08, MV-09 | ✅ |
| AC4 | SL-01, SL-04 | ✅ |
| AC5 | SL-02 | ✅ |
| AC6 | SL-03 | ✅ |
| AC7 | SL-06 | — |

**Gate A 通过条件**: 6 个 P0 用例全部通过（MV-01/02/03/04/06, MV-07/08/09, SL-01/04, SL-02, SL-03）。

---

### §4 环境测试

| ET# | 环境 | 预期 |
|-----|------|------|
| ET-01 | Chrome 最新版 | 全部通过 |
| ET-02 | Firefox 最新版 | 全部通过 |
| ET-03 | Edge 最新版 | 全部通过 |

---

| 日期 | 变更 | 触发 | 证据 |
|------|------|------|------|
| 2026-05-19 | 初始文档生成 | `/rui doc --from-code cdn/components/business/` | 源码反推，Level B |
