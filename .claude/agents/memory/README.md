# Agent 记忆文件目录

本目录存放各 agent 的记忆文件。每个 agent 维护一个独立的 `.md` 文件，记录历史调用中的关键发现和可复用经验。

## 格式规范

见 `../../shared/agent-memory-protocol.md`。

## 文件清单

| 文件 | 维护者 | 说明 |
|------|--------|------|
| `knowledge.md` | knowledge-curator | 跨 agent 共性知识策展 |
| `impact-analyst.md` | impact-analyst | 影响分析经验 |
| `quality-tracker.md` | quality-tracker | 质量趋势统计 |
| `spec-retriever.md` | spec-retriever | 规范检索经验 |
| `architect.md` | architect | 架构决策记忆 |
| `planner.md` | planner | 规划经验记忆 |
| `code-reviewer.md` | code-reviewer | 审查模式记忆 |
| `e2e-tester.md` | e2e-tester | 测试模式记忆 |
| `security-reviewer.md` | security-reviewer | 安全模式记忆 |
| `doc-reviewer.md` | doc-reviewer | 文档审查记忆 |
| `doc-updater.md` | doc-updater | 文档更新记忆 |
| `test-page-builder.md` | test-page-builder | 原型页构建记忆 |
| `docs-lookup.md` | docs-lookup | 文档查询记忆 |
| `impl-reporter.md` | impl-reporter | 实施报告记忆 |
| `message-pusher.md` | message-pusher | 推送文案记忆 |
| `weekly-analyzer.md` | weekly-analyzer | 周报分析与提炼记忆 |
| `mermaid-expert.md` | mermaid-expert | Mermaid 语法常见问题与修复模式 |

## 核心规则

1. Agent 只能写入自己的记忆文件
2. Agent 可读取其他 agent 的记忆文件作为参考
3. `knowledge-curator` 有权读取所有文件并策展共性知识
4. 每个文件最多 50 条条目，超出按可复用性淘汰
5. 详细协议见 `../../shared/agent-memory-protocol.md`