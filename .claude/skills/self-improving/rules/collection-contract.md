---
paths:
  - "skills/self-improving/rules/collection-contract.md"
  - "docs/*.md"
---

# 收集契约

```mermaid
graph TD
    FD[Feature Doc Generated] --> PS[Postscript]
    PS --> WSR[Workflow Standardization Review]
    WSR --> SAE[System Architecture Evolution Thinking]
    SAE --> SI[/self-improving collect]
    SI --> CACHE[docs/.memory/self-improvement-cache.jsonl]
```

> Agent 调度性能数据契约。定义了 `Workflow Standardization Review` 和 `System Architecture Evolution Thinking` 章节的标准化遥测格式，这些章节必须出现在每份 `build-feature`（document/code mode）生成的文档中。
>
> 这些章节是 agent 调度系统的**主要性能信号**：它们衡量每次交付的流程摩擦、决策质量、信息流动和架构健康度。

## 1. 范围

适用于 `build-feature` 产出的所有功能文档 `docs/<feature-name>.md`：

- document mode → §1 Feature Overview + §2 User Stories + §3 Usage + §4 Project Report + 后记
- code mode → §4 Project Report（含过程总结）

这些章节是**强制性的**，无论文档类型或变更级别（T1/T2/T3）。

## 2. 放置位置

在已有后记 `## Postscript: Future Planning & Improvements` **之后**追加这两个章节。顺序：

1. `Postscript: Future Planning & Improvements`
2. `## Workflow Standardization Review`
3. `## System Architecture Evolution Thinking`

若文档无后记，直接在文档末尾追加。

## 3. 工作流标准化复盘

### 3.1 目的

对产出**本文档**（或其中总结的实现）的过程进行标准化的四项回顾。

### 3.2 格式

```markdown
## Workflow Standardization Review

1. **重复劳动识别**：产出本文档/功能过程中，是否存在超过 2 次的重复手工操作？是否可以脚本化或模板化？
   - 答案：Yes / No / Partial
   - 证据：（具体操作，如"手动将接口定义复制到 03 和 04 中"）

2. **决策标准缺失**：是否存在依赖个人经验的模糊决策点？是否可以沉淀为检查清单或规则？
   - 答案：Yes / No / Partial
   - 证据：（具体决策，如"认证与会话之间的模块边界是临时决定的"）

3. **信息孤岛**：本功能是否依赖口头传达或临时文档？是否可以统一为单一真源？
   - 答案：Yes / No / Partial
   - 证据：（具体信息缺口，如"API 限流参数在 Slack 中传达，未写入 01"）

4. **反馈闭环**：本文档/实现过程中发现的问题，是否有明确的跟进负责人和验收节点？
   - 答案：Yes / No / Partial
   - 证据：（负责人和验收标准，或缺口描述）
```

### 3.3 约束

- **答案必须为**：`Yes`、`No`、`Partial` 之一。
- **证据是必填的**：每个答案至少包含一句具体说明。
- **禁止编造**：若确实没有，回答 `No` 并附证据"本次交付中未观察到"。
- **单文档范围**：只审查产出**本文档**的过程，非整个项目历史。

## 4. 系统架构演进思考

### 4.1 目的

捕获本文档所覆盖功能的架构层面反思。若文档无架构关联（如纯文案变更），回答"N/A"并附理由。

### 4.2 格式

```markdown
## System Architecture Evolution Thinking

- **A1. 当前架构瓶颈**：（性能 / 可维护性 / 可扩展性 / 安全性 / 无 / N/A）
  - 证据：（具体代码路径、设计张力或指标）

- **A2. 下一个自然演进节点**：（具体下一步，或稳定则写"无"）
  - 证据：（哪个模块/接口会变化，以及原因）

- **A3. 演进风险与回滚方案**：（风险描述 + 回滚策略）
  - 证据：（数据迁移、双写、功能开关等）
```

### 4.3 约束

- **瓶颈类型是必填的**：必须从枚举列表中选择或写 `N/A`。
- **N/A 理由**：若本功能未触及架构，说明"本文档未引入或修改架构交付物"。
- **证据是必填的**：即使答案是"无"，也要解释为什么预期无瓶颈/演进节点。
- **提出演进节点时必须包含回滚方案**。

## 5. 提取规则（供 `collect-self-improvement.js` 使用）

### 5.1 章节边界

使用正则锚点（不区分大小写）：

- 开始：`^##\s+Workflow Standardization Review\s*$`
- 结束：`^##\s+System Architecture Evolution Thinking\s*$` 或下一个 `^##\s+` 或 EOF
- 开始：`^##\s+System Architecture Evolution Thinking\s*$`
- 结束：下一个 `^##\s+` 或 EOF

### 5.2 字段解析

对于每个 `Workflow Standardization Review`：

- 通过模式提取 Q1–Q4 答案：`答案：\s*(Yes|No|Partial)`
- 通过模式提取证据：`证据：\s*(.+?)(?=\n\s*\d+\.|\n##|$)`
- 未找到时默认为 `"missing"`。

对于每个 `System Architecture Evolution Thinking`：

- 通过模式提取 A1 瓶颈：`\*\*A1[.\s]*当前架构瓶颈.*?\n\s*-\s*(.+?)(?=\n\s*-\s*\*\*A2|$)`
- 在 A2 标题后通过模式提取 A2 演进节点。
- 在 A3 标题后通过模式提取 A3 风险/回滚。
- 未找到时默认为 `"missing"`。

### 5.3 输出记录

每条提取记录为单行 JSON：

```json
{
  "feature": "user-login",
  "doc": "docs/<feature>.md §3",
  "week": "2026-04-27~2026-05-03",
  "workflow": {
    "q1": { "answer": "Yes", "evidence": "..." },
    "q2": { "answer": "No", "evidence": "..." },
    "q3": { "answer": "Partial", "evidence": "..." },
    "q4": { "answer": "Yes", "evidence": "..." }
  },
  "architecture": {
    "bottleneck": "scalability",
    "evolution_node": "shard session store",
    "risk_rollback": "risk: data migration; rollback: dual-write"
  },
  "extracted_at": "2026-05-03T12:00:00Z"
}
```

## 6. 缺失章节处理

若某文档缺少任一章：

1. 记录 P1 缺口：`"missing Workflow Standardization Review in docs/<feature>.md"`。
2. 发出存根记录，所有字段设为 `"missing"`。
3. 向文档头部追加提醒（除非处于更新模式，否则不自动编辑文档正文）。
