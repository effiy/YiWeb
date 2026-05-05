---
name: self-improving
description: |
  Performance measurement and aggregation for the build-feature pipeline.
  Collects per-document Workflow Standardization Review and
  System Architecture Evolution Thinking, producing consolidated
  data consumed by reporter during weekly report generation.
user_invocable: true
lifecycle: default-pipeline
contracts:
  output: shared/contracts.md
---

# self-improving

```mermaid
graph TD
    A[Feature doc generated] --> B[/self-improving collect]
    B --> C[Scan §Workflow Review + §Arch Evolution]
    C --> D[Write cache JSONL]
    D --> E{Aggregate trigger?}
    E -->|Weekly| F[/self-improving weekly]
    F --> G[Generate aggregate report]
    G --> H[reporter consumes for weekly]
```

## 定位

`self-improving` 是 `build-feature` 统一流水线的 **agent 调度性能系统**。它将每一次功能交付视为性能样本，收集标准化反思章节来衡量流程摩擦、架构漂移和反馈循环健康状况，覆盖整个 agent 生态系统。

它不生成主产物；它**衡量**调度系统产出这些产物的效率，**聚合**性能信号形成趋势，并通过周报**驱动**闭环改进。

### 何时使用

- 在任意 `build-feature`（document 或 code mode）运行之后，持久化单文档反思数据。
- 在周报生成期间，将反思数据聚合到周报工作流审查和架构演进章节中。
- 手动通过 `/self-improving collect` 刷新聚合缓存。

### 何时不使用

- 当尚不存在任何功能文档时（空收获属于正常情况，但 skill 会报告）。

## 命令

### 收集单文档反思

```
/self-improving collect
```

扫描 `docs/<feature-name>/*.md` 中的 `Workflow Standardization Review` 和 `System Architecture Evolution Thinking` 章节，将合并后的缓存写入 `docs/.memory/self-improvement-cache.jsonl`。

### 生成周度聚合

```
/self-improving weekly <YYYY-MM-DD>
```

读取缓存，按指定自然周过滤，产出 `docs/weekly/<week-range>/self-improvement-aggregate.md`。此文件由 `reporter` agent 在编制周报时消费。

## 输入产物

- `docs/<feature-name>.md` — 包含 §1–§4 + 后记的故事中心功能文档

## 输出产物

| 产物 | 路径 | 用途 |
|----------|------|---------|
| 缓存 | `docs/.memory/self-improvement-cache.jsonl` | 追加式行分隔 JSON，存储提取出的章节内容 |
| 周度聚合 | `docs/weekly/<week>/self-improvement-aggregate.md` | Markdown 表格，可直接注入周报 |

## 增量规则

### 1. 收集契约执行

每份由 `build-feature`（document 或 code mode）产生的文档必须包含两个标准化反思章节。若文档缺失这些章节，`self-improving` 记录 P1 缺口并向缓存追加存根提醒。

### 2. 聚合逻辑

- **工作流标准化复盘**：统计每项问题跨所有功能的"Yes/No/Partial"答案；暴露重复的手动操作和缺失的决策标准。
- **系统架构演进思考**：提取瓶颈类型（性能 / 可维护性 / 可扩展性 / 安全性 / 无 / N/A）和演进节点描述；标记共享同一瓶颈的功能。

### 3. 周度交接

`reporter` agent 在编写周报工作流审查和架构演进章节之前必须读取 `self-improvement-aggregate.md`。reporter 可以解读和排序优先级，但不得编造与聚合数据矛盾的内容。

## 停止条件

- `docs/` 下无功能目录：输出空聚合并注释"本周无活跃用户故事用例"。
- 缓存损坏：从全量扫描重建而非增量追加。

## 支持文件

```
skills/self-improving/
├── SKILL.md                    # 入口 + 清单（本文件）
├── README.md                   # 快速开始
├── rules/
│   ├── collection-contract.md  # 单文档章节格式 + 提取规则
│   └── weekly-integration.md   # 聚合数据如何输入 weekly-report.md
└── scripts/
    └── collect-self-improvement.js
```
