---
name: implement-code
description: 基于 `docs/<功能名>/` 文档集实施代码。用户明确要求开始实施代码或输入 `/implement-code ...` 时使用。4 阶段推进：预检→实施→验证→总结。
user_invocable: true
---

# implement-code

## 定位

`implement-code` 是代码实施编排器，负责 4 件事：

1. 预检文档并完成影响分析
2. 按项目架构实施代码
3. 审查验证代码质量
4. 生成实施总结

阶段细则由 `rules/` 承载，项目适配由 `rules/code-implementation.md` 承载。

## 核心原则

1. **文档驱动**：实施决策必须能回溯到文档或代码来源
2. **Agent 实干**：关键阶段必须调用 agent 并采纳其必答问题回答
3. **项目适配**：实施顺序和约束按 `rules/code-implementation.md`（每个项目已定制）
4. **影响链闭合**：代码变更前后必须做全项目影响分析
5. **默认自动决策**：尽量不打断，缺失信息写"待确认"并继续推进

## 何时使用

- 已有 `docs/<功能名>/` 文档集
- 用户明确要求开始实施代码
- 需要按阶段推进，不是直接"边写边试"

## 何时不使用

- 缺少 P0 文档（02_需求任务 + 03_设计文档 + 05_动态检查清单）
- 用户仍在做需求澄清或文档生成
- 只是零碎代码修补

## list 功能

`/implement-code list` — 列举 `docs/` 下可用功能目录（排除 `99_agent-runs`）。空结果时建议先运行 `generate-document`。

## Git 分支约定

进入实施模式时，若项目是 git 仓库：按功能名创建分支 `feat/<功能名>`；非 git 仓库跳过。

## 输入前提

P0 文档（缺失即阻断）：

| 文件 | 用途 |
|------|------|
| `02_需求任务.md` | 用户故事、场景、前置条件 |
| `03_设计文档.md` | 模块、接口、实现约束 |
| `05_动态检查清单.md` | 全部待验证检查项 |

P1/P2 文档（缺失不阻断）：

| 文件 | 用途 |
|------|------|
| `01_需求文档.md` | 背景与目标 |
| `04_使用文档.md` | UI 文案补充 |

## 4 阶段工作流

### 阶段 1：预检 + 影响分析

- 解析 `{功能名}`，预检 P0 文档是否齐全
- **必须调用 `spec-retriever`**：检索适用规范，读取记忆文件获取历史检索经验
- **必须调用 `impact-analyst`**：
  - 先读取 `../../shared/impact-analysis-contract.md`
  - 先读取 `.claude/agents/memory/impact-analyst.md`
  - 执行全项目影响链闭合分析（上游依赖、反向依赖、传递依赖、导出链、注册链）
  - 影响链分析结果**必须采纳**，确认设计文档改动点与真实代码一致
- **必须调用 `architect`**：确认架构方案与项目架构约定一致
- MCP 增强：`code-analyzer-mcp`（依赖分析）、`doc-index-mcp`（文档检索）、`git-workflow-mcp`（分支创建）
- 退出条件：P0 文档齐全 + 影响链闭合 + 架构确认

### 阶段 2：代码实施

- 按 `rules/code-implementation.md` 的实施顺序逐模块编码
- 每模块完成后**必须调用 `code-reviewer`** 审查：
  - P0 问题必须立即修复
  - P1/P2 记录但不阻断当前模块
- 每模块完成后自检：
  1. 消除 P0 语法错误
  2. 确认项目架构约束（见 `code-implementation.md`）
  3. 确认 data-testid 覆盖 + createBaseView 调用完整
  4. 全项目范围影响链回归验证
- MCP 增强：`code-analyzer-mcp`（架构检查）、`git-workflow-mcp`（变更影响分析）
- 退出条件：所有模块实现完成 + 逐模块验证记录齐全

### 阶段 3：验证 + 审查

- **必须调用 `code-reviewer`**：全量代码审查（架构一致性 + 编码规范 + 安全 + 边界处理）
- **项目特有 agent 必须调用**：
  - YiPet：`extension-tester`（manifest.json、content_scripts、权限）
  - shennong-ui：`auth-reviewer`（SSO 配置、鉴权流程、v-permission）
  - YiPot：审查 Tauri IPC 封装 + allowlist 最小化
  - YiWeb：审查 CDN 组件注册 + createBaseView 调用
  - YiAi：审查异步安全 + 服务层分离
  - YiH5：审查事件监听器清理 + CustomEvent 通信
- 验证 P0 检查项（来自 `05_动态检查清单`）
- MCP 增强：`code-analyzer-mcp`（死代码检测）
- 退出条件：无 P0 代码审查问题 + P0 检查项全部通过

### 阶段 4：总结 + 交付

- 生成 `06_实施总结.md`（结构见 `rules/process-summary.md`）
- 回写 `01/02/03/04/05/07` 的实施状态
- **必须调用 `quality-tracker`**：P0/P1/P2 统计追加到记忆文件
- **必须调用 `knowledge-curator`**：策展可复用知识到记忆文件
- 可选执行 `import-docs` 文档同步 + `wework-bot` 完成通知（完成后建议执行，但不作为强制门禁）
- 退出条件：总结写入完成 + 状态回写完成

## Agent 调用契约

| Agent | 触发阶段 | 必答问题 | 采纳规则 |
|-------|---------|---------|---------|
| `spec-retriever` | 1 | 无特定必答问题 | 返回规范列表用于后续步骤 |
| `impact-analyst` | 1 | 见 `.claude/agents/impact-analyst.md` | 影响链分析结果必须采纳，确认改动点与真实代码一致 |
| `architect` | 1 | 5 个必答问题见 `.claude/agents/architect.md` | 架构方案必须与项目约定一致 |
| `code-reviewer` | 2（每模块）+ 3（全量） | 见 `.claude/agents/code-reviewer.md` | P0 必须修复；P1/P2 记录不阻断 |
| 项目特有 agent | 3 | 见各项目 agent 定义 | P0 必须修复 |
| `quality-tracker` | 4 | 无特定必答问题 | 统计追加到记忆文件 |
| `knowledge-curator` | 4 | 无特定必答问题 | 知识提取到记忆文件 |

## 停止条件

以下情况必须停止并生成阻断版 `06_实施总结.md`：

- P0 文档缺失
- 影响链分析发现未闭环的阻断性依赖
- 代码审查 P0 问题无法修复
- 所有模块阻断且无法继续

停止时：
1. 记录阻断原因和已产生产物
2. 生成阻断版 `06_实施总结.md`
3. 回写阻断状态到 `01/02/03/04/05/07`
4. 建议执行 `import-docs` + `wework-bot` 阻断通知

## 相关技能与代理

| 名称 | 调用阶段 | 用途 |
|------|---------|------|
| `spec-retriever` | 1 | 智能规范检索 |
| `impact-analyst` | 1 | 全项目影响链分析 |
| `architect` | 1 | 架构确认 |
| `code-reviewer` | 2, 3 | 逐模块 + 全量代码审查 |
| `test-page-builder` | 2（前端项目） | 测试原型页 |
| `security-reviewer` | 3（涉及鉴权/安全） | 安全审查 |
| 项目特有 agent | 3 | 项目专项审查 |
| `quality-tracker` | 4 | 质量趋势统计 |
| `knowledge-curator` | 4 | 知识策展 |
| `import-docs` | 4（可选） | 文档同步 |
| `wework-bot` | 4（可选） | 完成/阻断通知 |

## 支持文件结构

```
.claude/skills/implement-code/
├── SKILL.md
├── README.md
└── rules/
    ├── code-implementation.md  # 项目专项约束（已定制）
    ├── artifact-contracts.md   # 产物与回写契约
    ├── verification-gate.md    # 验证规则
    ├── process-summary.md      # 总结文档结构
    ├── e2e-testing.md          # 测试策略
    └── test-page.md            # 原型页规范
```