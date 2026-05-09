# Agents

根 pm 决定做什么和不做什么，并驱动执行。

```mermaid
graph LR
    pm -->|决策: 做什么/不做什么| coder
    pm -->|决策: 做什么/不做什么| tester
    pm -->|决策: 做什么/不做什么| reporter
    pm -->|系统性问题| S_REFLECT["反思管线"]
    pm -->|安全审查| security
    pm -->|自改进| self_improve["self-improve"]

    subgraph "Story Pipeline"
        coder --> tester --> reporter
    end
    subgraph "Security Gate"
        security -->|实现审查| coder
        security -->|验证审查| tester
    end
    subgraph "Self-Improve Loop"
        self_improve -->|架构反思/工流诊断| STORE[("proposals.jsonl")]
        self_improve -->|效果评估+回顾| reporter
    end
```

| Agent | 文件 | 触发 |
|-------|------|------|
| pm | [pm.md](pm.md) | rui 全流程入口，反思钩子，架构漂移信号，自适应规划→策展 / init 基线注入→配置生成 |
| coder | [coder.md](coder.md) | pm 调度，rui 预检/实现/影响分析/架构设计，rui fix |
| tester | [tester.md](tester.md) | pm 调度，rui 测试先行/实现/验证/文档生成，rui fix，rui check |
| reporter | [reporter.md](reporter.md) | pm 调度，rui 交付/策展 |
| security | [security.md](security.md) | pm 安全审查委派，rui 预检/实现/验证 |
| self-improve | [self-improve.md](self-improve.md) | rui 自改进阶段，loop.js run --all |

---

## Init 管线

`/rui init` 的 Agent 生成管线：项目基线 → 基线注入 → Agent & Rule & Template & MCP → 就绪检查。

```mermaid
flowchart TD
    BASELINE["CLAUDE.md + README.md"] --> EXTRACT["基线注入<br/>提取项目约定"]
    EXTRACT --> AGENTS["agents/ 生成"]
    EXTRACT --> RULES["rules/ 生成"]
    EXTRACT --> TEMPLATES["templates/ 生成"]
    EXTRACT --> MCP[".mcp.json 生成"]
    AGENTS --> CHECK["就绪检查 (8项)"]
    RULES --> CHECK
    TEMPLATES --> CHECK
    MCP --> CHECK
```

### 基线注入映射

| 提取项 | 来源 | 注入目标 |
|--------|------|---------|
| 技术栈与版本 | README.md 技术栈表 | coder.md、security.md |
| 编码规范 | CLAUDE.md 编码规范 | coder.md、tester.md |
| 禁止事项 | CLAUDE.md 禁止事项 | rules/code-pipeline.md、coder.md |
| 目录结构 | CLAUDE.md + README.md | rules/ paths、AGENT.md 影响分析范围 |
| 关键文件 | CLAUDE.md 关键文件 | coder.md、security.md |
| 构建与运行 | README.md 快速开始 | coder.md、tester.md |
| 核心架构 | README.md 核心架构 | coder.md、tester.md |

### 配置结构

```
.claude/
├── agents/
│   ├── AGENT.md          # 本文件
│   ├── pm.md
│   ├── coder.md
│   ├── tester.md
│   ├── reporter.md
│   ├── security.md
│   └── self-improve.md
├── rules/
│   ├── code-pipeline.md
│   ├── doc-generation.md
│   ├── gate-rules.md
│   └── self-improve.md
├── skills/rui/templates/
│   ├── 故事任务模板.md
│   ├── 后端技术评审模板.md
│   ├── 前端技术评审模板.md
│   ├── 测试用例评审模板.md
│   ├── 后端实施报告模板.md
│   ├── 前端实施报告模板.md
│   ├── 测试用例报告模板.md
│   └── 自改进复盘模板.md
└── .mcp.json
```

---

## 证据标准（反幻觉）

所有写入 `docs/` 或影响实现决策的陈述必须可验证或标注为未知。

| Level | 含义 | 如何撰写 |
|-------|------|---------|
| A 已验证 | 可通过 Read/Grep/Glob 验证 | 直接陈述，附路径 |
| B 可推导 | 通过明确规则从 A 推导一步 | "由……可得" |
| C 未验证 | 用户口述、未抓取网页 | `> 待补充` |
| D 禁止 | 无 A/B 支撑且非 C | 视为幻觉 |

---

## 全项目影响分析

每个变更点追踪上下游到闭合。删除/重命名/修改公共接口前证明所有调用方已覆盖。

**步骤**: 列出变更点 → 搜索词 → 全项目搜索 → 二级传递 → 标注处置。

**P0 门禁**: 搜索完成前不生成设计结论；影响链未闭合不删/改公共接口。