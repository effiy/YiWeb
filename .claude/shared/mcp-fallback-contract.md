# MCP 降级契约

> 本文件定义 `generate-document` 与 `implement-code` 所涉及的 MCP 工具的降级策略，确保 MCP 不可用时流程仍能继续，同时保留降级记录。

## 1. 总原则

1. **MCP 不可用不得阻断流程**：所有 MCP 都必须有降级方案
2. **禁止静默降级**：所有降级都必须记录到产物（`06_实施总结.md` 或 `docs/99_agent-runs/`）
3. **探针先行**：阶段 0 必须检测 MCP 可用性，提前声明降级状态
4. **降级记录格式**：`MCP 降级：<MCP 名称> — <工具名> — 原因：<原因> — 降级方案：<方案> — 影响：<影响描述>`

## 2. MCP 降级映射

### 2.1 已有 MCP

| MCP | 工具 | 降级方案 | 是否可阻断 |
|-----|------|---------|-----------|
| `playwright` | 浏览器操作 | `npx playwright test` + 人工确认 | 否 |

### 2.2 新增 MCP

| MCP | 工具 | 降级方案 | 是否可阻断 |
|-----|------|---------|-----------|
| `code-analyzer-mcp` | `analyze_dependencies` | Grep 搜索 import/export 语句 + Read 读取文件头 | 否 |
| `code-analyzer-mcp` | `find_usages` | Grep 全项目搜索标识符 | 否 |
| `code-analyzer-mcp` | `check_architecture` | Read 读取 Store/组件注册文件 + 人工模式匹配 | 否 |
| `code-analyzer-mcp` | `detect_dead_code` | Grep 搜索导出名 + Grep 搜索引用次数 | 否 |
| `doc-index-mcp` | `search_docs` | Grep 搜索 `docs/` 目录下文件内容 | 否 |
| `doc-index-mcp` | `get_doc_structure` | Read 读取文件 + 提取 `##` 标题 | 否 |
| `doc-index-mcp` | `find_cross_refs` | Grep 搜索 `[` 和 `](` 模式 | 否 |
| `doc-index-mcp` | `validate_links` | Read + Glob 验证文件路径存在性 | 否 |
| `git-workflow-mcp` | `create_feature_branch` | Bash 执行 `git checkout -b feat/<name>` | 否 |
| `git-workflow-mcp` | `get_diff_summary` | Bash 执行 `git diff --stat` + `git diff --name-status` | 否 |
| `git-workflow-mcp` | `analyze_change_impact` | 退回 `impact-analyst` 的 Grep 搜索方案 | 否 |
| `git-workflow-mcp` | `check_branch_status` | Bash 执行 `git status` + `git log` | 否 |

## 3. 探针检查

### 3.1 探针时机

阶段 0（文档驱动 / Grounding）必须完成所有 MCP 探针检查。

### 3.2 探针方法

对每个 MCP 执行最小可行探针：

| MCP | 探针命令/方法 | 通过条件 |
|-----|-------------|---------|
| `code-analyzer-mcp` | 调用 `analyze_dependencies` 传入当前项目入口文件 | 返回非空依赖列表 |
| `doc-index-mcp` | 调用 `search_docs` 搜索 `README` | 返回结果或"未找到" |
| `git-workflow-mcp` | 调用 `check_branch_status` | 返回当前分支信息 |
| `playwright` | 打开 `about:blank` | 页面成功加载 |

### 3.3 探针结果处理

- **通过**：正常使用 MCP 工具
- **失败**：
  1. 记录探针失败原因
  2. 激活降级方案
  3. 在阶段 0 的产出中声明降级状态
  4. 后续阶段使用降级方案执行

## 4. 降级记录要求

### 4.1 记录位置

- `06_实施总结.md` 的「MCP 明细」章节
- 若未到阶段 7，写入 `docs/99_agent-runs/` 下的运行记录

### 4.2 记录格式

```
MCP 降级记录：
  - code-analyzer-mcp / analyze_dependencies — 原因：MCP 服务未启动 — 降级方案：Grep 搜索 import/export — 影响：依赖图构建精度降低，需人工确认间接依赖
  - doc-index-mcp / search_docs — 原因：MCP 未安装 — 降级方案：Grep 搜索 docs/ 目录 — 影响：搜索结果缺少章节锚点定位
```

### 4.3 wework-bot 通知

MCP 降级信息必须写入 wework-bot 通知的 `🧩 MCP 明细` 行，格式：
- 正常：`🧩 MCP 明细：<MCP1> ✅ / <MCP2> ✅`
- 降级：`🧩 MCP 明细：<MCP1> ✅ / <MCP2> ⚠️ 降级(<降级方案>)`

## 5. 与其他共享规范的关系

- MCP 降级记录必须遵守 `evidence-and-uncertainty.md` 的真值层级（降级方案的效果描述为 C 类）
- `impact-analyst` agent 使用 MCP 降级方案时，须在产物中标注降级状态
- `impl-reporter` 在生成实施总结时，须在 Mermaid 图中用虚线框标注 MCP 降级节点