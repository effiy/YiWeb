---
name: implement-code
description: 基于 `docs/<功能名>/` 文档集实施代码。用户明确要求开始实施代码或输入 `/implement-code ...` 时使用。4 阶段推进：预检→实施→验证→总结。
user_invocable: true
---

# implement-code

## ⚠️ 重要约束

**必须使用对应功能的 Git 分支：** 仓库为 git 时，实施全过程（含一切本地代码改动）**只能**在 **`feat/<功能名>`** 上进行；其中 `<功能名>` 必须与本次 `{功能名}` 及目录 `docs/<功能名>/` 一致。进入实施模式后、**任何代码变更之前**，须检出已有分支或从默认分支新建并切换至该分支；若当前不在该分支，须先切换再改动。**禁止**在 `main`/`master` 或与本次功能无关的分支上实施本技能要求的改动。非 git 仓库不适用本条。

**写代码前必须完成真实场景最小可用测试（Gate A）：** 在开始任何代码实现前，必须基于 `02_需求任务.md` 的主场景，在真实页面/真实入口完成一次最小可用（MVP）流程验证并留存证据（命令、日志、截图或录屏路径）；未通过或无证据时，禁止进入代码实施阶段。**细则与证据标准**：[`rules/implement-code-testing.md`](./rules/implement-code-testing.md) §2。

**写代码后必须由 AI 自动跑通主流程冒烟（Gate B）：** 完成代码后，必须由 AI 自动执行主流程全链路冒烟测试（覆盖主路径起点→关键交互→预期结果→状态回写），并确认通过后方可进入总结与交付；若自动冒烟失败，按阻断处理并推送门禁异常通知。**执行标准**：[`rules/implement-code-testing.md`](./rules/implement-code-testing.md) §3。

**UI/E2E 落地格式**（清单路径、`data-testid`、`tests/` 布局）见 [`rules/e2e-testing.md`](./rules/e2e-testing.md)；编排阶段映射见 [`rules/orchestration.md`](./rules/orchestration.md) 阶段 1 / 6。

**只要调用本技能，就必须在结束时触发 `import-docs` + `wework-bot`：**先执行 `import-docs` 同步文档，再执行 `wework-bot` 发送完成/阻断/门禁异常通知；两步缺一不可。

**本技能尽可能一次执行到底：**默认直接采用推荐策略推进（按 `rules/` 与项目约定执行），尽量不向用户追问确认；需要人工介入时才允许中断。

**需要人工介入时必须推送 wework-bot：**任何“阻断 / 门禁异常 / 需要人工介入”都必须发送 wework-bot 通知，确保接收者可在群内直接看到原因、证据与恢复点。

## 编排会话日志（强制）

每次执行本技能时，在会话内**每完成一轮**与下列资源的交互后，必须追加写入仓库根目录 **`docs/周报/<YYYY-MM-DD>~<YYYY-MM-DD>/logs.md`**（**Markdown**，非 `.log`）：

- `.claude/skills/` 下的技能（如 `import-docs`、`wework-bot`、`e2e-testing`）
- `.claude/agents/` 下的 Agent（如 `spec-retriever`、`impact-analyst`、`code-reviewer`）
- MCP 工具（记录工具标识与调用要点）
- 为驱动步骤而显式读取并依赖结论的 `shared/`、`agents/memory/` 契约（`--kind memory` 或 `shared`）

**记录内容**：每条为一个小节，包含 **操作场景**（可参考 [`eval/skills/implement-code.md`](../../eval/skills/implement-code.md) 的用户故事句式）与 **对话与交互摘要**。可选用 **`--case good|bad`**、**`--tags`**、**`--lesson`**，标准见 [`docs/logs/CASE-STANDARD.md`](../../docs/logs/CASE-STANDARD.md)。

**命令**（在仓库根目录执行）：

```bash
node .claude/scripts/log-orchestration.js --skill implement-code \
  --kind <skill|agent|mcp|memory|shared|other> [--name <标识>] \
  [--scenario "<操作场景>"] \
  [--case <good|bad|neutral>] [--tags "<tag1,tag2>"] [--lesson "<后续改进一句>"] \
  [--text "<单行摘要>"]
```

未提供 `--text` 时从 stdin 读入正文（**保留换行**）。详见 `rules/orchestration.md`「编排会话日志」。

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

- 缺少 P0 文档（02*需求任务 + 03*设计文档 + 05\_动态检查清单）
- 用户仍在做需求澄清或文档生成
- 只是零碎代码修补

## list 功能

`/implement-code list` — 列举 `docs/` 下可用功能目录（排除 `99_agent-runs`）。空结果时建议先运行 `generate-document`。

## Git 分支约定（强制）

- **git 仓库**：必须使用 **`feat/<功能名>`**，与文档目录 `{功能名}` 一一对应；首个代码改动前完成分支就绪（`git switch -c` 或 `git switch`）。
- **非 git 仓库**：跳过分支步骤，不阻断流程。
- **核验**：实施笔记、`06_实施总结.md` 的任务概览中应记录最终所用分支名（见 `rules/process-summary.md`）。

## 输入前提

P0 文档（缺失即阻断）：

| 文件                 | 用途                     |
| -------------------- | ------------------------ |
| `02_需求任务.md`     | 用户故事、场景、前置条件 |
| `03_设计文档.md`     | 模块、接口、实现约束     |
| `05_动态检查清单.md` | 全部待验证检查项         |

P1/P2 文档（缺失不阻断）：

| 文件             | 用途        |
| ---------------- | ----------- |
| `01_需求文档.md` | 背景与目标  |
| `04_使用文档.md` | UI 文案补充 |

## 4 阶段工作流

### 阶段 1：预检 + 影响分析

- 解析 `{功能名}`；若为 git 仓库，**先在 `feat/<功能名>` 上就绪分支**，再预检 P0 文档是否齐全
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

- 进入本阶段前，**必须先完成 Gate A（真实场景 MVP + 可追溯证据）并通过**（见 `rules/implement-code-testing.md`、`rules/orchestration.md` 阶段 1）
- 按 `rules/code-implementation.md` 的实施顺序逐模块编码
- 每模块完成后**必须调用 `code-reviewer`** 审查：
  - P0 问题必须立即修复
  - P1/P2 记录但不阻断当前模块
- 每模块完成后自检：
  1. 消除 P0 语法错误
  2. 确认项目架构约束（见 `code-implementation.md`）
  3. 确认 data-testid 覆盖 + 入口初始化/集成方式完整
  4. 全项目范围影响链回归验证
- MCP 增强：`code-analyzer-mcp`（架构检查）、`git-workflow-mcp`（变更影响分析）
- 退出条件：所有模块实现完成 + 逐模块验证记录齐全

### 阶段 3：验证 + 审查

- **必须调用 `code-reviewer`**：全量代码审查（架构一致性 + 编码规范 + 安全 + 边界处理）
- **必须执行 Gate B（AI 自动主流程冒烟）并通过**：覆盖主路径全链路，失败则不得进入阶段 4（见 `rules/implement-code-testing.md`、`rules/verification-gate.md` §8）
- **项目特有 agent 必须调用**：以 `.claude/agents/` 中与当前技术栈匹配的专项定义为准（如浏览器扩展测试、鉴权审查、桌面 IPC、视图入口与组件注册等）；仓库未配置专项 agent 时，以 `code-reviewer` 与项目 checklist 覆盖等价关注点。
- 验证 P0 检查项（来自 `05_动态检查清单`）
- MCP 增强：`code-analyzer-mcp`（死代码检测）
- 退出条件：无 P0 代码审查问题 + P0 检查项全部通过

### 阶段 4：总结 + 交付

- 生成 `06_实施总结.md`（结构见 `rules/process-summary.md`）
- 回写 `01/02/03/04/05/07` 的实施状态
- **必须调用 `quality-tracker`**：P0/P1/P2 统计追加到记忆文件
- **必须调用 `knowledge-curator`**：策展可复用知识到记忆文件
- **必须执行 `import-docs` 文档同步 + `wework-bot` 通知推送**（完成/阻断/门禁异常）：严格按 `../wework-bot/SKILL.md` 的「生动总结格式规范」发送通知，通知内容必须包含 `⏱️ 用时`、`🪙 会话用量`、`🤖 模型`、`🧰 工具`、`🕒 最后更新时间`（精确到秒）；默认直接读取系统环境变量 `API_X_TOKEN` 执行同步，仅在变量缺失时提示；`☁️ 文档同步` 仅在已执行 import-docs 时填写真实结果（创建/覆盖/失败），不得虚构。
- 退出条件：总结写入完成 + 状态回写完成 + 通知发送完成

## Agent 调用契约

| Agent               | 触发阶段               | 必答问题                                     | 采纳规则                                         |
| ------------------- | ---------------------- | -------------------------------------------- | ------------------------------------------------ |
| `spec-retriever`    | 1                      | 无特定必答问题                               | 返回规范列表用于后续步骤                         |
| `impact-analyst`    | 1                      | 见 `.claude/agents/impact-analyst.md`        | 影响链分析结果必须采纳，确认改动点与真实代码一致 |
| `architect`         | 1                      | 5 个必答问题见 `.claude/agents/architect.md` | 架构方案必须与项目约定一致                       |
| `code-reviewer`     | 2（每模块）+ 3（全量） | 见 `.claude/agents/code-reviewer.md`         | P0 必须修复；P1/P2 记录不阻断                    |
| 项目特有 agent      | 3                      | 见各项目 agent 定义                          | P0 必须修复                                      |
| `quality-tracker`   | 4                      | 无特定必答问题                               | 统计追加到记忆文件                               |
| `knowledge-curator` | 4                      | 无特定必答问题                               | 知识提取到记忆文件                               |

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
4. **必须执行 `import-docs` + `wework-bot` 阻断通知**（先 import-docs，再 wework-bot；import-docs 若失败也不得省略通知，需在通知与总结中记录失败摘要）

## 相关技能与代理

| 名称                | 调用阶段           | 用途                   |
| ------------------- | ------------------ | ---------------------- |
| `spec-retriever`    | 1                  | 智能规范检索           |
| `impact-analyst`    | 1                  | 全项目影响链分析       |
| `architect`         | 1                  | 架构确认               |
| `code-reviewer`     | 2, 3               | 逐模块 + 全量代码审查  |
| `e2e-testing`         | 1（按需）          | 场景级 E2E 策略与用例骨架（产出须满足 Gate A/B） |
| `test-page-builder` | 2（前端项目）      | 测试原型页             |
| `security-reviewer` | 3（涉及鉴权/安全） | 安全审查               |
| 项目特有 agent      | 3                  | 项目专项审查           |
| `quality-tracker`   | 4                  | 质量趋势统计           |
| `knowledge-curator` | 4                  | 知识策展               |
| `import-docs`       | 4（强制）          | 文档同步               |
| `wework-bot`        | 4（强制）          | 完成/阻断/门禁异常通知 |

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
    ├── implement-code-testing.md  # Gate A/B 准入与证据（真源）
    ├── e2e-testing.md          # E2E 目录与 testid 细则
    └── test-page.md            # 原型页规范
```
