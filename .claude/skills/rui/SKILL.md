---
name: rui
description: Story-driven SDLC orchestrator: story → document → code → delivery. Command: /rui.
user_invocable: true
lifecycle: default-pipeline
agents:
  required: [pm, coder, tester, reporter, security, self-improve]
---

# rui

故事驱动 SDLC 编排器。需求拆分产生多个故事时逐故事串行处理，每个故事独立走完管线，确保最小可用、可测试、可交付。

```mermaid
flowchart TD
    USER["/rui &lt;command&gt; &lt;input&gt;"] --> ROUTE{command}
    ROUTE -->|init| INIT["基线 → 基线注入 → Agent&Rule&Template&MCP → 就绪检查"]
    ROUTE -->|"init --all"| INIT_ALL["基线 → ... → 就绪检查 → 项目模块分析 → 逐模块端到端"]
    ROUTE -->|doc &lt;requirement&gt;| SPLIT["需求拆分 → 逐故事串行: 自适应规划→影响分析→架构设计→文档生成"]
    ROUTE -->|"update &lt;name&gt; [context]"| UPDATE["存在性检查 → 版本/结构检测 → 结构补齐 → 上下文解析 → 变更分级 → 增量更新"]
    ROUTE -->|code &lt;name&gt;| CODE["预检→测试先行→实现→验证→自改进"]
    ROUTE -->|&lt;requirement&gt;| FULL["需求拆分 → 逐故事串行: 文档管线 → 代码管线 端到端"]
    ROUTE -->|list| LIST["扫描故事任务面板 → 输出未完成故事列表"]
    ROUTE -->|empty| SUGGEST["扫描项目与故事状态 → 推荐 5~10 条任务提示"]
    ROUTE -->|"code --from-doc <name>"| DOC_EXISTING["存在性检查→缺口检测→读取01→自适应规划→影响分析→架构设计→文档生成"]
    ROUTE -->|"doc --from-code <requirement>"| DOC_CODE["代码分析→需求推导→故事创建→自适应规划→影响分析→架构设计→文档生成"]
    DOC_CODE -->|"--full"| DOC_CODE_FULL["代码分析→需求推导→故事创建→全文档基线(01-08) + 补充文档(09+10+) → 交付"]

    INIT --> DELIVER["交付: wework-bot 追加日志 → import-docs → wework-bot 发送"]
    INIT_ALL --> DELIVER
    SPLIT --> DELIVER
    CODE --> DELIVER
    FULL --> DELIVER
    LIST --> DELIVER
    UPDATE --> DELIVER
    SUGGEST --> DELIVER
    DOC_EXISTING --> DELIVER
    DOC_CODE --> DELIVER
    DOC_CODE_FULL --> DELIVER
```

---

## --help

`/rui` 及其子命令均支持 `--help` 标志，输出对应层级用法说明后退出，不执行任何管线操作。

### 触发规则

| 输入 | 行为 |
|------|------|
| `/rui --help` | 输出技能级总览（全部命令 + 常用示例） |
| `/rui init --help` | 输出 `init` 子命令详细用法（含 `--all`） |
| `/rui doc --help` | 输出 `doc` 子命令详细用法 |
| `/rui code --from-doc --help` | 输出 `code --from-doc` 子命令详细用法 |
| `/rui doc --from-code --help` | 输出 `doc --from-code` 子命令详细用法（含 `--full`） |
| `/rui doc --from-code --all --help` | 输出 `doc --from-code --all` 批量模式详细用法 |
| `/rui code --from-doc --all --help` | 输出 `code --from-doc --all` 批量模式详细用法 |
| `/rui update --help` | 输出 `update` 子命令详细用法 |
| `/rui code --help` | 输出 `code` 子命令详细用法 |
| `/rui list --help` | 输出 `list` 子命令用法 |

### 输出格式（技能级）

```
📖 /rui — Story-driven SDLC orchestrator

Usage: /rui <command> [input] [options]

Commands:
  init [--all]          Establish project baseline (--all: full coverage)
  doc <requirement>     Split requirement into stories, run doc pipeline
  doc --from-code <src> Reverse-engineer story docs from code (read-only, three input forms)
  code --from-doc <n>   Generate missing 02-08 baseline docs from existing 01 (read-only)
  update <name> [ctx]   Upgrade existing story (structure + content)
  code <name>           Implement story (precheck → test → code → verify → self-improve)
  <requirement>         End-to-end: doc pipeline → code pipeline
  list                  List all incomplete stories with progress
  (no args)             Scan project + story status, recommend 5-10 tasks

<requirement> can be:
  - Text description (e.g. "用户登录功能，支持密码和OAuth")
  - @file reference (e.g. @docs/req/login.md)
  - URL (e.g. https://example.com/req.md)

Options:
  --help                Show this help

Use /rui <command> --help for detailed usage of a specific command.
```

### 子命令 --help 输出格式

`/rui init --help`：
```
📖 /rui init — Establish project baseline

Usage: /rui init [--all]

  (no flag)   Generate CLAUDE.md + README.md, agents/, rules/, templates/, .mcp.json
              → readiness check → deliver. No stories generated.
  --all       After readiness check: module analysis → per-module end-to-end
              (story split → doc pipeline → code pipeline). Supports resume.

Options:
  --help      Show this help
```

`/rui doc --help`：
```
📖 /rui doc — Split requirement and run doc pipeline

Usage: /rui doc <requirement>

  <requirement>: Parse requirement → split into stories → per story: adaptive
    planning → impact analysis → architecture design → doc generation → deliver.
    Produces 01-故事任务.md + 02-08 full baseline docs per story.

  <requirement> accepts three forms:
    - Text description  (e.g. "用户登录功能，支持密码和OAuth")
    - @file reference    (e.g. @docs/req/login.md)
    - URL                (e.g. https://example.com/req.md)

  See also: /rui doc --from-code --help (reverse-engineer from code)
            /rui code --from-doc --help (generate missing docs from 01)

Options:
  --help      Show this help
```

`/rui doc --from-code --help`：
```
📖 /rui doc --from-code — Reverse-engineer story docs from code

Usage: /rui doc --from-code <requirement> [--full]

  <requirement> accepts three forms:
    - Source path        e.g. src/views/aicr/
    - Code snippet       e.g. a block of JS/TS/Python/... code text
    - Code description   e.g. "一个 Vue 组件，接收 filePath prop..."

  Analyze <requirement> → derive requirement → create story → generate 01-08
  full baseline docs. Read-only, no code changes.
  --full: Append supplementary documents (09 + story extensions 10+) beyond
    the default 01-08 baseline — page design, API contracts, data migration
    plans, etc. — all derived from code, no code changes made.

Options:
  --help      Show this help
```

`/rui doc --from-code --all --help`：
```
📖 /rui doc --from-code --all — Batch reverse-engineer stories from code

Usage: /rui doc --from-code --all

  Identify independent source modules across the project → per module:
  reverse-engineer story → generate 01-08 full baseline docs.
  Skips modules with existing story dirs in docs/故事任务面板/.
  Read-only, no code changes. Single module blockage won't affect others.

Options:
  --help      Show this help
```

`/rui code --from-doc --help`：
```
📖 /rui code --from-doc — Generate missing baseline docs from existing 01

Usage: /rui code --from-doc <name> [--full]
       /rui code --from-doc --all

  <name>: Read existing 01-故事任务.md → generate missing 02-08 full baseline
    docs. Skips requirement parsing and story splitting. Read-only, no source
    code changes.
  --all: Batch-process all stories with missing 02-08 baseline docs.
  --full: (with <name>) Append supplementary docs (09 + story extensions 10+)
    on top of the 01-08 baseline. All derived from code/story analysis, no
    code changes made.

Options:
  --help      Show this help
```

`/rui update --help`：
```
📖 /rui update — Upgrade/update existing story

Usage: /rui update <name> [context]

  Existence check → version/structure detection → gap fill →
  context parse → change level (T1/T2/T3) → incremental update → deliver.

  [context] optional: supplementary info for content update.
  Without [context]: auto-detect optimization suggestions from story docs.

Options:
  --help      Show this help
```

`/rui code --help`：
```
📖 /rui code — Implement story (code pipeline)

Usage: /rui code <name>

  Precheck (impact analysis + branch isolation + doc fill) →
  test-first (Gate A) → implement (module-by-module, P0 clearance) →
  verify (Gate B, ≤2 repair rounds) → self-improve → deliver.
  Final output: 8 docs + .improvement/ + .memory/ per story.

Options:
  --help      Show this help
```

`/rui list --help`：
```
📖 /rui list — List incomplete stories

Usage: /rui list

  Scan docs/故事任务面板/, output progress table with status per story.
  Pure query, no pipeline execution.

Options:
  --help      Show this help
```

输出后立即退出，不触发管线、不写文件、不发送通知。

---

## 命令概览

| 命令 | 流程 |
|------|------|
| `/rui init` | 基线 → 基线注入 → Agent&Rule&Template&MCP → 就绪检查 → 交付（不生成故事，仅建立项目骨架） |
| `/rui init --all` | 基线 → ... → 就绪检查 → 项目模块分析 → 逐模块 `/rui <requirement>` 端到端 → 交付（全项目故事覆盖） |
| `/rui doc <requirement>` | 需求拆分 → 逐故事串行: 自适应规划→影响分析→架构设计→文档生成 → 交付 |
| `/rui code --from-doc <name>` | 存在性检查→缺口检测→读取01→自适应规划→影响分析→架构设计→文档生成 → 交付（从已有01生成缺失的02-08全文档，只读，禁止改动源代码） |
| `/rui code --from-doc --all` | 扫描所有02-08缺失的故事 → 逐故事串行生成缺失文档 → 交付（只读） |
| `/rui doc --from-code <requirement>` | 代码分析→需求推导→故事创建→自适应规划→影响分析→架构设计→文档生成 → 交付（从源码路径/代码片段/代码描述反推故事，生成01-08全文档基线，只读，禁止改动源代码） |
| `/rui doc --from-code <requirement> --full` | 代码分析→需求推导→故事创建→全文档基线(01-08) + 补充文档(09+10+) 一次性产出。在基线基础上追加页面设计/API契约/数据迁移等拓展文档——全部从代码推导，不改动任何代码文件 → 交付 |
| `/rui doc --from-code --all` | 识别独立源码模块 → 逐模块反推故事 → 交付（跳过已有故事目录的模块，只读） |
| `/rui update <name> [context]` | 存在性检查 → 版本/结构检测 → 结构补齐 → 上下文解析 → 变更分级 → 增量更新 → 交付（老故事流程升级 + 内容优化/补充/重写） |
| `/rui code <name>` | 预检（含文档补齐）→ 测试先行 → 实现 → 验证 → 自改进 → 交付（01-故事任务.md 必须存在，缺失的技术评审自动补齐，最终产出故事目录全文档） |
| `/rui <requirement>` | 需求拆分 → 逐故事串行: 文档管线 → 代码管线 端到端 → 交付 |
| `/rui list` | 扫描故事任务面板，列出所有未完成故事及其进度状态 |
| `/rui`（空输入） | 扫描项目与故事状态 → 推荐 5~10 条任务提示 |

> `.claude` 配置管理请使用 [`/rui-claude`](../rui-claude/SKILL.md) 技能（sync / diff）。

`<requirement>` 可以是：
- 需求描述文本（如 `用户登录功能，支持密码和OAuth`）
- `@` 引用的本地文件路径（如 `@docs/req/login.md`）
- 需求文档 URL（如 `https://example.com/req.md`）

rui 自动将需求拆分为多个故事，每个故事独立创建目录。故事目录名使用**方便建立 git 分支命名的英文简洁描述**（如 `user-login`、`oauth-bindding`、`sms-verify`）。

---

## 核心规则

0. **逐故事操作**: 需求拆分可创建多个故事目录，但每个故事独立走完文档管线后再处理下一个，确保每个故事独立、最小可用、可测试、可交付
1. **增量更新**: 已有文档按 T1/T2/T3 裁剪
2. **测试先行**: Gate A 阻断实现；Gate B >2 轮修复阻断交付
3. **逐模块审查**: 实现阶段每模块后审查，P0 清零前进
4. **双边影响**: 预检阶段同时分析代码和文档影响
5. **分支隔离**: 预检阶段从 main 拉取 feat/<name> 分支
6. **知识沉淀**: 策展阶段写执行记忆 + rui-state.json
7. **import-docs 强制同步**: 管线多个检查点必须调用 `Skill(import-docs, --workspace)` 同步文档到远端——每个检查点独立执行，不等待管线末端。检查点包括：① 文档生成后（01-08 基线产出即同步）② 验证后（05-07 实施/测试报告产出即同步）③ 交付阶段（最终全量同步）。H9 降级仅当 API_X_TOKEN 环境变量缺失时生效，其他失败（网络/权限）记录告警但不阻断管线，留待下次 rui 运行时重试覆盖
8. **产出内聚**: 关键产出只允许是对应故事目录（`docs/故事任务面板/<name>/`）下的文件内容，不得在故事目录外生成文档、报告或其他产出物
9. **禁止自动合并**: `/rui code` 和 `/rui <requirement>` 在任何阶段均不得将功能分支自动合并到 main 分支，合并操作一律由开发者手动执行（H12）
10. **只读代码**: `/rui doc --from-code` 和 `/rui code --from-doc` 仅生成文档，禁止修改、创建、删除任何源代码文件

---

**项目基线：** 生成 `CLAUDE.md` + `README.md`（双文件 × N 子项目）。

---

## /rui init

建立项目基线，不逐故事生成。每个故事通过 `/rui <name>` 单独操作。

```mermaid
flowchart TD
    INIT["/rui init"] --> BASELINE["项目基线<br/>CLAUDE.md + README.md"]
    BASELINE --> INJECT["基线注入<br/>从 CLAUDE.md + README.md 提取项目约定"]
    INJECT --> AGENTS["Agent & Rule & Template & MCP<br/>agents/ + rules/ + templates/ + .mcp.json"]
    AGENTS --> CHECK{"就绪检查"}
    CHECK -->|PASS| ROUTE_ALL{"--all?"}
    CHECK -->|FAIL| FIX["修复缺失项"]
    FIX --> CHECK
    ROUTE_ALL -->|否| DELIVER["交付"]
    ROUTE_ALL -->|是| PREFLIGHT["--all 前置校验<br/>构建脚本 + 依赖 + 关键目录"]
    PREFLIGHT --> RESUME_CHECK{"all-modules.json<br/>存在且有未完成模块?"}
    RESUME_CHECK -->|是| RESUME["断点续传<br/>加载已有模块清单 → 跳到第一个未完成模块"]
    RESUME_CHECK -->|否| MODULE["项目模块分析<br/>扫描项目结构 → 识别独立功能模块"]
    MODULE --> PERSIST["持久化模块清单<br/>all-init → all-modules.json"]
    PERSIST --> PER_MODULE["逐模块: /rui &lt;requirement&gt; 端到端<br/>故事拆分 → 文档管线 → 代码管线"]
    RESUME --> PER_MODULE
    PER_MODULE --> DELIVER
```

| 阶段 | 做什么 | 关键产出 |
|------|--------|---------|
| 项目基线 | 生成 CLAUDE.md + README.md<br>pm, coder | CLAUDE.md、README.md |
| 基线注入 | 从 CLAUDE.md + README.md 提取项目约定，注入下游生成<br>pm | 项目约定摘要（技术栈、编码规范、禁止事项、目录结构、关键文件） |
| Agent & Rule & Template & MCP | 基于项目约定生成/更新 agents/、rules/、templates/、.mcp.json<br>pm | AGENT.md、pm.md/coder.md/tester.md/security.md/reporter.md（含项目特定规则）、rules/（code-pipeline.md、doc-generation.md、gate-rules.md、self-improve.md）、templates/（故事任务模板.md、后端技术评审模板.md、前端技术评审模板.md、测试用例评审模板.md、后端实施报告模板.md、前端实施报告模板.md、测试用例报告模板.md、自改进复盘模板.md）、.mcp.json |
| 就绪检查 | 8 项检查，失败则修复重检<br>tester, reporter, security | 8 项检查全部通过 |
| --all 前置校验（仅 `--all`） | 检查构建脚本可用性、关键依赖安装状态、源码目录存在性<br>pm | 前置校验通过（阻断则不进入模块分析） |
| 断点续传检查（仅 `--all`） | 检查 `docs/.memory/all-modules.json` 是否存在且有未完成模块。存在则跳过模块分析，直接从第一个 pending/in_progress 模块继续<br>pm | 续传：输出已完成摘要 + 剩余模块列表 |
| 项目模块分析（仅 `--all`，首次运行） | 扫描项目结构、CLAUDE.md、README.md、源码目录，识别独立功能模块，每个模块生成需求描述。完成后调用 `all-init` 持久化<br>pm | 模块清单 + all-modules.json |
| 逐模块端到端（仅 `--all`） | 每个模块依次执行 `/rui <requirement>` 端到端：故事拆分 → 逐故事: 文档管线 → 代码管线 → 交付。每模块完成后调用 `all-module-done`，阻断时调用 `all-module-blocked`<br>pm, coder, tester, security, reporter, self-improve | 每个故事目录全文档（模板基线 + 故事拓展） + .improvement/ + .memory/ |
| 交付 | import-docs → wework-bot | — |

### 基线注入

从项目基线 CLAUDE.md + README.md 提取以下项目约定，作为 Agent、Rule、Template、MCP 生成的输入：

| 提取项 | 来源 | 注入目标 |
|--------|------|---------|
| 技术栈与版本 | README.md 技术栈表 | coder.md（技术约束）、security.md（第三方审查范围） |
| 编码规范 | CLAUDE.md 编码规范 | coder.md（实现规则）、tester.md（测试规范） |
| 禁止事项 | CLAUDE.md 禁止事项 | rules/code-pipeline.md（硬性约束）、coder.md（审查标准） |
| 目录结构 | CLAUDE.md + README.md | rules/ 的 paths 声明、AGENT.md 影响分析范围 |
| 关键文件 | CLAUDE.md 关键文件 | coder.md（入口文件感知）、security.md（安全边界） |
| 构建与运行 | README.md 快速开始 | coder.md（开发流程）、tester.md（测试环境） |
| 核心架构 | README.md 核心架构 | coder.md（架构模式约束）、tester.md（测试隔离策略） |

**注入原则**：项目约定只在对应 agent/rule 中出现一次，不重复 CLAUDE.md 原文，而是转化为可执行规则。例如 CLAUDE.md 说"禁止在 content script 中使用 ES modules"，coder.md 写为"所有 content script 必须使用 IIFE + script 标签加载，禁止 import/export 语法"。

### 就绪检查

| # | 检查项 | 验证 |
|---|-------|------|
| 1 | docs/故事任务面板/ 目录存在 | `test -d` |
| 2 | 项目 CLAUDE.md 存在且非空 | `wc -l` |
| 3 | 项目 README.md 存在且非空 | `wc -l` |
| 4 | .claude/agents/AGENT.md 存在且非空 | `wc -l` |
| 5 | 基线 agent（pm/coder/tester/security/reporter）.md 全部存在 | `test -f` |
| 6 | .mcp.json 存在且为有效 JSON | `node -e` |
| 7 | .claude/rules/ 目录存在且含至少一条规则 | `ls` |
| 8 | .claude/skills/rui/templates/ 目录存在且含至少一个模板 | `ls` |

### --all 模式

`--all` 标志在就绪检查通过后，自动对全项目进行模块分析和端到端故事生成。适合项目初始化后一次性建立所有模块的故事目录和全文档。

```mermaid
flowchart TD
    READY["就绪检查 PASS"] --> RESUME_CHECK{"all-modules.json<br/>存在且有未完成模块?"}
    RESUME_CHECK -->|是| RESUME["断点续传<br/>加载已有模块清单 → 跳到第一个未完成模块"]
    RESUME_CHECK -->|否| SCAN["项目模块分析<br/>pm 扫描项目结构"]
    SCAN --> IDENTIFY["识别独立功能模块"]
    IDENTIFY --> PERSIST["持久化<br/>all-init → all-modules.json"]
    PERSIST --> M1["模块 1: /rui &lt;req&gt; 端到端<br/>故事拆分 → 逐故事: 文档管线 → 代码管线"]
    RESUME --> SKIP_DONE["跳过已完成/已阻断模块"]
    SKIP_DONE --> M1_NEXT["从第一个 pending 模块继续<br/>逐模块: /rui &lt;req&gt; 端到端"]
    M1 --> D1["✓ 模块 1 交付 → all-module-done"]
    D1 --> M2["模块 2: /rui &lt;req&gt; 端到端"]
    M2 --> D2["✓ 模块 2 交付 → all-module-done"]
    D2 --> MN["..."]
    MN --> DONE["全项目故事覆盖完成"]
    M1_NEXT --> D1
```

#### 项目模块分析

pm 扫描以下信息源，识别项目中的独立功能模块：

| 扫描源 | 提取内容 |
|--------|---------|
| 项目目录结构 | 源码子目录（如 `src/components/`、`src/utils/`、`src/pages/`），每个独立目录簇为一个候选模块 |
| CLAUDE.md | 项目架构描述、关键文件列表、核心模块说明 |
| README.md | 核心架构图、技术栈、功能特性列表 |
| 现有代码文件 | 入口文件、路由定义、模块导出，反向推导功能边界 |
| Git 历史 | 最近提交涉及的功能区域，辅助判断模块活跃度和边界 |

**模块识别规则**：

1. 每个模块必须是一个独立的功能单元，有清晰的边界和职责
2. 模块之间低耦合，可独立开发和测试
3. 模块名使用英文简洁描述（如 `auth-system`、`data-export`、`ui-components`）
4. 优先识别有用户可感知价值的模块（面向用户的功能），其次为基础设施模块
5. 每个模块生成一段需求描述（2-5 句话），作为该模块 `/rui <requirement>` 的输入

#### 状态持久化

`--all` 模式的模块分析结果持久化到 `docs/.memory/all-modules.json`，支持断点续传和进度追踪。

| 操作 | 脚本命令 | 说明 |
|------|---------|------|
| 初始化 | `node skills/rui/scripts/rui-state.js all-init [--file <path>] [--force]` | 写入模块清单 JSON（stdin 或 --file 输入），生成 session_id 和时间戳。若已存在未完成运行则警告退出，--force 覆盖 |
| 模块完成 | `node skills/rui/scripts/rui-state.js all-module-done --name <module> [--stories <csv>]` | 标记模块为 completed，记录关联故事名。全部模块终端态时自动设置 top-level status |
| 模块阻断 | `node skills/rui/scripts/rui-state.js all-module-blocked --name <module> --reason <text>` | 标记模块为 blocked，记录阻断原因，top-level status → blocked |
| 进度查看 | `node skills/rui/scripts/rui-state.js all-status [--json]` | 输出模块进度表（markdown table）或完整 JSON |

**执行约束**：
- pm 完成模块分析后，调用 `all-init` 持久化模块清单
- 每个模块端到端完成后，调用 `all-module-done` 记录（含故事名列表）
- 模块被阻断时，调用 `all-module-blocked` 记录原因，继续处理下一个模块
- 全部模块处理完毕后，汇总阻断清单供人工介入

#### 断点续传

`rui init --all` 支持中断后恢复：

1. 重新运行 `rui init --all` 时，就绪检查通过后首先检查 `docs/.memory/all-modules.json` 是否存在
2. 如果文件存在且 status 为 `in_progress` 或 `blocked` 且有未完成模块：
   - pm 输出已完成的模块摘要和剩余模块列表
   - 从第一个 `pending` 或 `in_progress` 状态的模块继续处理
   - 已完成（`completed`）和已阻断（`blocked`）的模块跳过
3. 如果所有模块已完成或已阻断，输出汇总并跳过逐模块处理，直接进入交付阶段
4. 如果文件不存在，执行完整模块分析流程（同首次运行）

#### 模块清单输出

模块清单同时持久化到 `docs/.memory/all-modules.json`。执行 `node skills/rui/scripts/rui-state.js all-status` 查看进度。

```
📦 项目模块分析（共 N 个模块）

1. auth-system: 用户认证系统，支持密码登录、OAuth、短信验证码
   源码: src/auth/, src/middleware/auth.ts
   
2. data-export: 数据导出功能，支持 CSV/PDF 格式导出
   源码: src/export/, src/utils/format.ts

3. notification: 消息通知系统，站内信 + 企微推送
   源码: src/notification/, src/bot/

...
```

#### 逐模块端到端

每个模块依次执行完整端到端管线，等同于 `/rui <requirement>`：

```mermaid
flowchart LR
    REQ["模块需求描述"] --> SPLIT["故事拆分"]
    SPLIT --> S1["故事 1: 文档管线 → 代码管线"]
    S1 --> S2["故事 2: 文档管线 → 代码管线"]
    S2 --> SN["..."]
    SN --> DONE_M["模块完成"]
```

单个故事内部流程（与 `/rui <requirement>` 端到端一致）：

| 阶段 | 内容 |
|------|------|
| 需求解析 | 解析模块需求描述文本 |
| 故事拆分 | 拆分为独立故事，每个故事创建目录（英文简洁命名） |
| 文档管线 | 自适应规划 → 影响分析 → 架构设计 → 文档生成（产出 01~08 + §6 §7） |
| 代码管线 | 预检（含文档补齐）→ 测试先行 → 实现 → 验证 → 自改进（产出 05~08 + .improvement/ + .memory/） |
| 交付 | wework-bot 追加日志 → import-docs → wework-bot 发送 |

**执行约束**：
- 模块间串行：前一个模块的全部故事完成后再处理下一个模块
- 模块内逐故事串行：每个故事独立走完文档+代码管线后再处理下一个故事
- 每个故事最终产出全文档（模板基线 01~08 + 按故事内容拓展的 10+ 补充文档）+ `.improvement/proposals.jsonl` + `.memory/` 数据存储
- 阻断规则与 `/rui <requirement>` 端到端一致（H1~H12）

**阻断后行为**：当前故事/模块阻断时，记录阻断原因，继续处理下一个模块。全部模块处理完毕后，汇总阻断清单供人工介入。

完成 init 后，使用 `/rui doc <requirement>` 拆分需求为故事，再逐个故事执行 `/rui code <name>` 或 `/rui <name>`。

---

## /rui doc \<requirement\>

从需求描述/文档拆分故事，逐故事执行自适应规划→影响分析→架构设计→文档生成 → 交付。不执行策展和项目基线。

### 需求输入

`<requirement>` 支持三种格式：
- **文本描述**: 直接输入需求文字，rui 分析并拆分为故事
- **@文件引用**: 使用 `@path/to/file.md` 引用本地需求文档
- **URL**: 提供需求文档的在线地址，rui 抓取后分析

### 故事拆分规则

1. 分析需求，识别独立功能单元
2. 每个功能单元对应一个故事目录
3. 故事目录名使用**英文简洁描述**，便于 git 分支命名（如 `user-login`、`chat-export`、`screenshot-capture`）
4. 拆分后逐故事走完文档管线，不并行

```mermaid
flowchart TD
    INPUT["需求输入<br/>文本 / @文件 / URL"] --> PARSE["需求解析"]
    PARSE --> SPLIT["故事拆分<br/>每个故事 = 一个功能单元"]
    SPLIT --> STORY1["故事 1: 自适应规划→影响分析→架构设计→文档生成"]
    STORY1 --> DONE1["✓ 故事 1 完成"]
    DONE1 --> STORY2["故事 2: 自适应规划→影响分析→架构设计→文档生成"]
    STORY2 --> DONE2["✓ 故事 2 完成"]
    DONE2 --> STORYN["..."]
    STORYN --> DONEN["✓ 故事 N 完成<br/>全部故事文档管线完成"]
```

每个故事内部流程：

```mermaid
flowchart TD
    PLAN[自适应规划] --> IMPACT[影响分析]
    IMPACT --> ARCH[架构设计]
    ARCH --> DOCGEN[文档生成]
```

| 阶段 | 做什么 | 关键产出 |
|------|--------|---------|
| 需求解析 | 读取需求输入（文本/@文件/URL），提取功能需求<br>pm | 需求摘要 |
| 故事拆分 | 将需求拆分为独立功能单元，每个单元创建故事目录（英文简洁命名）<br>pm | 故事目录列表 `docs/故事任务面板/<story-name>/` |
| 自适应规划 | 读取执行记忆，判定 T1/T2/T3 变更级别<br>pm | rui-state.json |
| 影响分析 | 单个故事全项目影响链分析，闭合所有依赖<br>coder, reporter | 01-故事任务.md（§3 设计概述 + 影响链） |
| 架构设计 | 单个故事模块划分、接口规范、数据流设计、测试用例规划<br>coder, security, tester | 02-后端技术评审.md、03-前端技术评审.md、04-测试用例评审.md |
| 文档生成 | agent 协作<br>pm (§1,§2,§4), coder (§3), tester (§1.1,§5), reporter (§4 依赖), security (安全面判定) | 01-故事任务.md（完整） |

### 增量裁剪

| 级别 | 触发条件 | 影响分析 | 架构设计 | 文档生成 |
|------|---------|---------|---------|---------|
| T1 微观 | 措辞、格式修正 | 跳过 | 跳过 | 仅变更章节 |
| T2 局部 | 增删故事/接口变更 | 裁剪 | 裁剪 | 重写目标+下游 |
| T3 范围 | 范围边界变化、跨故事重构 | 完整重跑 | 完整重跑 | 全级联刷新 |

---

## /rui doc --from-code \<requirement\>

从已有代码反推故事任务，**必须读取项目源代码及文档**，在禁止改动任何源代码的前提下生成全文档基线（01-08）。支持三种输入形式：

| 输入形式 | 示例 | 行为 |
|---------|------|------|
| 源码路径 | `src/views/aicr/` | 递归读取目录下所有源文件，同时读取 CLAUDE.md / README.md / 已有故事文档理解项目上下文 |
| 代码片段 | 一段 JS/TS/Python/... 代码文本 | 分析片段中的模块职责、接口、数据流 |
| 代码描述 | "一个 Vue 组件，接收 filePath prop，渲染代码并支持行号点击" | 基于自然语言描述反推完整故事 |

**全文档基线（01-08）包含**：01-故事任务 + 02-后端技术评审 + 03-前端技术评审 + 04-测试用例评审 + **05-后端实施报告 + 06-前端实施报告 + 07-测试用例报告 + 08-自改进复盘**。全部从代码分析和文档探索中推导，不改动任何代码文件，不创建功能分支，不进入代码管线。

> **核心约束：禁止改动任何代码文件。** 代码分析和文档探索均为只读操作——仅读取源码和文档提取结构和逻辑信息用于反推全文档。不得修改、重构、格式化任何 `.js` `.ts` `.py` `.vue` `.html` `.css` 等源文件。违反此规则等同于 H12 阻断。

```mermaid
flowchart LR
    ANALYZE["代码分析<br/>源码路径 → 读文件 + 项目上下文<br/>代码片段/描述 → 直接分析结构和逻辑"] --> DERIVE["需求推导<br/>反向推导：做什么、为谁、价值"]
    DERIVE --> CREATE["故事创建<br/>创建目录 + 01-故事任务.md（§1~§7）"]
    CREATE --> PLAN["自适应规划"]
    PLAN --> IMPACT["影响分析"]
    IMPACT --> ARCH["架构设计"]
    ARCH --> GEN["文档生成<br/>02-08 全文档基线"]
    GEN --> DELIVER_FC["交付"]
```

| 阶段 | 做什么 | Agent |
|------|--------|-------|
| 代码分析 | 按输入类型处理：**源码路径** → 递归读取目录下所有源文件 + CLAUDE.md/README.md + 已有故事文档理解项目上下文；**代码片段** → 直接分析片段中的模块职责、接口、数据流；**代码描述** → 基于描述推理模块结构。六维度分析：入口文件/核心组件、公共 API/接口契约、数据流（store/hooks/API 调用）、状态变化路径、用户交互逻辑、文件依赖关系。分析结果不写入文件——直接作为全文档推导的上下文。**只读操作，禁止改动任何源代码。** | pm, coder |
| 需求推导 | 从代码分析结果反向推导需求描述：这个模块做什么、为谁做、产生什么价值。生成 2-5 句需求描述 + 英文 story name（kebab-case，适合 git 分支命名）。目标：外部观察者读完 01 就能理解模块目的和设计决策。 | pm |
| 故事创建 | 在 `docs/故事任务面板/<story-name>/` 下创建故事目录。生成完整 01-故事任务.md：§1 Story（角色、范围边界、依赖）、§1.1 User Ops（从交互代码反推用户操作流程）、§2 Requirements（从接口/数据模型反推功能点和业务规则）、§3 Design（从代码结构反推设计概述 + 决策表，引用02/03详述）、§4 Tasks（从文件清单反推任务拆解）、§5 AC（从代码逻辑反推验收标准）、§6 改进清单、§7 演进任务。证据标准 A（代码可验证）。 | pm, coder, tester, security |
| 自适应规划 | 从推导的需求上下文写入 rui-state.json。 | pm |
| 影响分析 | 分析该模块对全项目的影响链，扩展影响细节写入02/03。 | coder, reporter |
| 架构设计 | 基于实际代码架构设计后端/前端方案和测试策略，产出 02-08 全文档基线的内容设计。02-04 从代码结构反推，05-08 从代码+文档探索推导。 | coder, security, tester |
| 文档生成 | 写入 01-故事任务.md（在故事创建阶段已写入）+ 02-08 全文档基线（05-后端实施报告 + 06-前端实施报告 + 07-测试用例报告 + 08-自改进复盘），插入交叉引用。 | pm, coder, tester, security, reporter, self-improve |
| 文档同步 CP1 | **import-docs 强制同步**：01-08 基线文档产出后立即调用 `Skill(import-docs, --workspace)` 推送到远端。不等待管线末端。 | rui 系统 |
| 交付 | import-docs（CP3 最终同步）+ wework-bot。 | rui 系统 |

### 代码分析规则

pm + coder 读取源码时关注以下维度，将代码结构映射到文档章节：

| 分析维度 | 关注点 | 映射到文档 |
|---------|--------|-----------|
| 模块职责 | 入口文件、核心类/工厂函数、公共 API 导出 | §1 Story |
| 组件结构 | 组件树层级、插槽/props/events、组件注册方式 | §3 Design（决策表）, 03-前端技术评审 |
| 数据流 | Store/Hooks 定义、API 调用链、状态变化路径 | §3 Design（决策表）, 02-后端技术评审 |
| 接口契约 | API endpoint、请求/响应格式、错误处理 | §2 Requirements, 02-后端技术评审 |
| 用户交互 | 事件处理器、UI 状态矩阵、交互流程 | §1.1 User Ops, 04-测试用例评审 |
| 文件清单 | 完整源文件列表、文件间依赖关系 | §4 Tasks |

源码路径模式下，以 `<input>` 为入口递归包含子目录，优先从 CLAUDE.md 的关键文件表和架构描述定位核心文件。代码片段/描述模式下，直接对输入内容执行六维度分析，不访问文件系统。分析结果不写入文件——直接作为需求推导和故事创建的上下文。

### --full 补充文档生成

`--full` 标志在基线 01-08 之上追加补充文档（09 + 10+ 拓展），不改动任何代码文件。

```mermaid
flowchart TD
    ANALYZE["代码分析<br/>源码路径/代码片段/代码描述"] --> DERIVE["需求推导<br/>反向推导需求 + story name"]
    DERIVE --> CREATE["故事创建<br/>01-故事任务.md §1~§7"]
    CREATE --> PLAN["自适应规划"]
    PLAN --> IMPACT["影响分析"]
    IMPACT --> ARCH["架构设计"]
    ARCH --> BASELINE["全文档基线产出<br/>02-后端技术评审 + 03-前端技术评审 + 04-测试用例评审"]
    BASELINE --> REPORTS["实施报告生成<br/>05-后端实施报告 + 06-前端实施报告 + 07-测试用例报告"]
    REPORTS --> RETRO["自改进复盘<br/>08-自改进复盘.md"]
    RETRO --> EXT{"--full?"}
    EXT -->|是| SUPP["补充文档生成<br/>09 + 10+ 按需拓展"]
    EXT -->|否| DELIVER["交付"]
    SUPP --> DELIVER
```

| 阶段 | 做什么 | Agent | 产出 |
|------|--------|-------|------|
| 代码分析 | 同标准 `--from-code`：六维度分析（模块职责、组件结构、数据流、接口契约、用户交互、文件清单） | pm, coder | — |
| 需求推导 | 反向推导需求描述 + story name | pm | — |
| 故事创建 | 生成完整 01-故事任务.md（§1~§7，含影响链、任务拆解、验收标准） | pm, coder, tester, security | 01-故事任务.md |
| 自适应规划 | 写入 rui-state.json | pm | rui-state.json |
| 影响分析 | 分析模块对全项目的影响链 | coder, reporter | 01 §3 设计决策表更新 |
| 架构设计 | 后端/前端方案 + 测试策略 | coder, security, tester | 02-08 内容设计 |
| 文档管线 | 写入 02-08，交叉引用 | pm, coder, tester, security, reporter, self-improve | 02-08 |
| 实施报告 | 从代码结构推导交付文件清单、实际接口/组件比对、偏差说明、P0 审查结果、样式/存储验证 | coder | 05 + 06 |
| 测试报告 | 从代码逻辑推导测试环境、冒烟/回归/专项用例、已知问题、Gate B 评估 | tester | 07 |
| 自改进复盘 | 执行记忆回望 + 基线配置复盘 + 改进项沉淀 | pm, reporter, self-improve | 08 |
| 故事拓展 | 按故事特征判断是否需要拓展文档（页面设计/API契约/数据迁移等），从代码中提取对应信息生成 | pm, coder, security | 09+10+ |
| 交付 | import-docs + wework-bot | rui 系统 | — |

**标准 `--from-code` 与 `--full` 的区别**：

| 维度 | 标准 `--from-code` | `--from-code --full` |
|------|-------------------|---------------------|
| 产出范围 | 01-08（全文档基线） | 01-08 + 09+10+（基线 + 补充） |
| 补充文档 (09+10+) | 不生成 | 按故事特征按需生成 |
| 代码改动 | 无 | 无 |
| 功能分支 | 不创建 | 不创建 |
| 适用场景 | 代码→需求反推、全文档初始化 | 存量代码深度文档化、补充页面设计/API 契约等拓展文档 |

> **不改动任何代码文件。** `--full` 与标准 `--from-code` 一样是只读操作——所有报告从代码分析推导，不修改、不创建、不删除任何源文件。

### --all 批量模式

`/rui doc --from-code --all` 不要求 `<input>`：

1. 读取 CLAUDE.md 的「关键文件」表和项目结构章节
2. 识别独立源码模块（逻辑同 `init --all` 模块分析：按入口文件/目录边界划分）
3. 对每个模块，检查 `docs/故事任务面板/` 下是否已有对应故事目录（01-故事任务.md 存在即视为已有）
4. 跳过已有故事目录的模块，输出跳过清单
5. 逐模块串行执行 `--from-code <requirement>` 管线
6. 单个模块阻断不影响后续模块
7. 全部完成后统一交付

### 与现有命令的关系

| 命令 | 输入 | 产出 |
|------|------|------|
| `/rui doc <req>` | 需求文本 | 新故事 01-08（从零创建） |
| `/rui code --from-doc <name>` | 已有 01 | 缺失的 02-08（补全，只读） |
| `/rui doc --from-code <requirement>` | 源码路径 / 代码片段 / 代码描述 | 新故事 01-08（从代码反推，只读） |
| `/rui doc --from-code <requirement> --full` | 源码路径 / 代码片段 / 代码描述 | 新故事 01-08 + 09+10+ 补充文档（基线 + 拓展，只读） |
| `/rui init --all` | 全项目 | 全模块端到端（含 init + 代码管线） |

---

## /rui code --from-doc \<name\>

对已有故事目录，**必须读取 01-故事任务.md + 探索项目源代码及已有文档**，在禁止改动任何源代码的前提下生成缺失的 02-08 全文档。不创建新故事，不创建功能分支，不进入代码管线。

**全文档（02-08）包含**：02-后端技术评审 + 03-前端技术评审 + 04-测试用例评审 + **05-后端实施报告 + 06-前端实施报告 + 07-测试用例报告 + 08-自改进复盘**。05-08 从源代码分析和已有文档推导，已有文档不覆盖，仅生成缺失项。

> **核心约束：禁止改动任何代码文件。** 只生成缺失的基线文档（02-08），不得修改、创建、删除任何源代码文件。不得进入代码管线（test-first → implement → verify）。探索源代码为只读操作——仅读取以推导实施报告、测试报告和复盘内容。

```mermaid
flowchart LR
    CHECK["存在性检查"] --> GAPS["缺口检测"]
    GAPS -->|"02-08已有文档"| SKIP["跳过（不覆盖）"]
    GAPS -->|缺失| EXPLORE["读取01 + 探索源码及已有文档<br/>只读，禁止改动任何源代码"]
    EXPLORE --> PLAN["自适应规划"]
    PLAN --> IMPACT["影响分析"]
    IMPACT --> ARCH["架构设计"]
    ARCH --> GEN["文档生成（仅缺失项）<br/>02/03/04 从01推导<br/>05/06/07/08 从源码+文档推导"]
    SKIP --> DONE["全部存在时输出已齐全并退出"]
    GEN --> DELIVER_EX["交付"]
```

| 阶段 | 做什么 | Agent |
|------|--------|-------|
| 存在性检查 | 验证 `docs/故事任务面板/<name>/` 目录和 `01-故事任务.md` 存在。不存在则阻断（H1）。 | pm |
| 缺口检测 | 检查 02-08 的存在性。全部存在则输出"已齐全"并退出。只生成缺失项，已有文档不覆盖。 | pm |
| 读取 01 + 源码探索 | 全文读取 01-故事任务.md（提取 §1~§5）+ **探索项目源代码及已有文档**（CLAUDE.md / README.md / 源码目录）。源码探索为只读——仅用于推导 05-08 的实施报告、测试报告和复盘内容。 | pm, coder |
| 自适应规划 | 从已有 01 派生需求上下文，写入 rui-state.json。从现有文档和源码分析结果生成全文档基线。 | pm |
| 影响分析 | 分析故事对全项目的影响链，必要时更新 01 §3 的设计决策表。 | coder, reporter |
| 架构设计 | 设计后端/前端架构方案和测试策略，产出 02-08 的内容设计。02-04 从 01 推导，05-08 从源码+文档探索推导。 | coder, security, tester |
| 文档生成 | 写入缺失的 02-08 文件（仅缺失项），插入交叉引用链接。证据标准 A/B/C/D。 | pm, coder, tester, security, reporter, self-improve |
| 文档同步 CP1 | **import-docs 强制同步**：缺失文档补齐后立即调用 `Skill(import-docs, --workspace)` 推送到远端。 | rui 系统 |
| 交付 | import-docs（CP3 最终同步）+ wework-bot。与其他命令一致的交付流程。 | rui 系统 |

### 缺口检测

只生成缺失文档，已有文档不覆盖：

| 检测项 | 方法 | 行为 |
|--------|------|------|
| 02-后端技术评审.md | 检查文件存在 | 缺失则生成 |
| 03-前端技术评审.md | 检查文件存在 | 缺失则生成 |
| 04-测试用例评审.md | 检查文件存在 | 缺失则生成 |
| 05-后端实施报告.md | 检查文件存在 | 缺失则从代码+01推导生成 |
| 06-前端实施报告.md | 检查文件存在 | 缺失则从代码+01推导生成 |
| 07-测试用例报告.md | 检查文件存在 | 缺失则从代码逻辑+04推导生成 |
| 08-自改进复盘.md | 检查文件存在 | 缺失则从执行记忆+配置推导生成 |

全部存在时输出"文档已齐全，无需生成"并退出。

### 需求推导规则

pm 从 01-故事任务.md 提取以下信息作为文档管线的输入：

| 来源章节 | 提取内容 | 用于 |
|---------|---------|------|
| §1 Story | 角色、范围边界、依赖 | 自适应规划（范围判定） |
| §2 Requirements | 功能点、输入输出、业务规则、数据约束 | 影响分析、架构设计 |
| §3 Design | 设计决策、概述 | 架构设计（02/03 技术评审） |
| §4 Tasks | 任务拆解、交付物、依赖 | 影响分析（交付物范围） |
| §5 Acceptance Criteria | 验收标准、测试方法、Gate 映射 | 04-测试用例评审.md |

### --all 批量模式

`/rui code --from-doc --all` 不要求 `<name>` 参数。

1. 执行 `node skills/rui/scripts/list.js --json` 获取故事状态
2. 筛选：`01-故事任务.md` 存在 且 (02-08 中任何文档缺失) 的故事
3. 若无匹配故事，输出"所有故事文档已齐全"并退出
4. 输出批量计划：故事列表 + 各故事缺失文档清单
5. 逐故事串行执行单故事管线（同上）
6. 单个故事阻断不影响其他故事，阻断原因记录在批量汇总中
7. 全部完成后统一交付

### 与 /rui doc \<requirement\> 的区别

| 维度 | /rui doc \<requirement\> | /rui code --from-doc \<name\> |
|------|--------------------------|-------------------------------|
| 输入 | 新需求文本 / @文件 / URL | 已有 01-故事任务.md |
| 故事拆分 | 有（自动拆分新故事） | 无（故事已存在） |
| 产出范围 | 01-08（全量新生） | 缺失的 02-08 |
| 功能分支 | 不涉及 | 不涉及 |

### 与 /rui update \<name\> 的区别

| 维度 | /rui update \<name\> | /rui code --from-doc \<name\> |
|------|---------------------|-------------------------------|
| 文档质量 | 结构补齐占位（标注"由 rui update 补齐"） | 完整文档管线产出（证据标准 A/B/C/D） |
| 影响分析 | 仅 T2/T3 时执行 | 始终执行 |
| 架构设计 | 仅 T2/T3 时执行 | 始终执行 |
| 适用场景 | 老版本升级、增量内容更新 | 基线文档缺失，需从 01 生成 |

### --full 补充文档生成

`--full` 标志在补齐 02-08 的基础上，根据 01-故事任务.md 的故事特征判断并生成补充文档（09+10+）。与 `--from-code --full` 共享同一套补充文档生成规则。

| 阶段 | 做什么 | Agent | 产出 |
|------|--------|-------|------|
| 特征分析 | 读取 01 §1/§2/§3 判断故事特征，按决策表确定需生成的补充文档 | pm | 补充文档清单 |
| 补充生成 | 按决策表生成对应补充文档，插入交叉引用 | coder, security | 09+10+ |

> 补充文档生成规则见 [全文档概念与故事拓展](#全文档概念与故事拓展)。

---

## /rui update \<name\> [context]

对已有故事任务进行流程升级、结构补齐或内容更新。三种场景合一：
- **流程升级**：老故事目录缺少新版流程要求的目录/文档/章节 → 自动检测并补齐
- **内容更新**：补充/优化/重写故事内容（mock→真实接口、需求变更、方案优化）
- **混合**：先升级结构，再应用内容更新

```mermaid
flowchart TD
    CHECK["存在性检查<br/>验证故事目录 + 01-故事任务.md"] --> DETECT["版本/结构检测<br/>对比当前模板，检测缺口"]
    DETECT --> GAPS{"有结构缺口?"}
    GAPS -->|是| UPGRADE["结构补齐<br/>创建缺失目录/文件/章节"]
    GAPS -->|否| PARSE["上下文解析"]
    UPGRADE --> PARSE
    PARSE --> CLASSIFY{"变更分级<br/>T1 / T2 / T3"}
    CLASSIFY -->|T1 微观| T1["仅变更目标章节"]
    CLASSIFY -->|T2 局部| T2["影响分析 → 更新受影响文档 + 下游"]
    CLASSIFY -->|T3 范围| T3["完整重跑文档管线"]
    T1 --> DELIVER_U["交付"]
    T2 --> DELIVER_U
    T3 --> DELIVER_U
```

| 阶段 | 做什么 | 关键产出 |
|------|--------|---------|
| 存在性检查 | 验证 `docs/故事任务面板/<name>/` 目录和 `01-故事任务.md` 存在<br>不存在则阻断（同 H1） | — |
| 版本/结构检测 | 对照当前模板结构逐项检查故事目录：目录结构、文档完整性、01 章节完整性、版本头、交叉引用<br>pm | 结构缺口清单 |
| 结构补齐 | 按缺口清单执行：创建缺失目录/文件、按当前模板生成缺失文档、补充 01 缺失章节、添加版本头和交叉引用<br>pm | 补齐的故事目录（与当前流程一致） |
| 上下文解析 | 解析 `[context]` 补充信息，或扫描文档自检优化方向<br>pm, coder | 影响范围清单 / 优化建议 |
| 变更分级 | 按 T1/T2/T3 判定变更级别 | rui-state.json（更新） |
| 增量更新 | 按级别更新受影响文档，T3 完整重跑文档管线<br>pm, coder, tester, security | 更新的故事文档 |

### 版本/结构检测规则

逐项检查，任一项不满足则视为存在结构缺口：

| # | 检测项 | 方法 | 缺口判定 |
|---|--------|------|---------|
| 1 | 目录结构 | `test -d docs/故事任务面板/<name>/.improvement && test -d docs/故事任务面板/<name>/.memory` | 任一不存在 → 旧版目录结构 |
| 2 | 文档完整性 | 检查 `01-故事任务.md` ~ `08-自改进复盘.md` 是否齐全（01 已由存在性检查确认） | 任一份缺失 → 文档不完整 |
| 3 | 版本头 | 检查 01 首行（标题下方）是否有 `> \| v` 开头的版本标记行 | 无 → 旧版文档 |
| 4 | 证据标准 | 检查 01 顶部是否有 `> **证据标准**:` 行 | 无 → 旧版文档 |
| 5 | 技术评审链接 | 检查 01 顶部是否有 `> **技术评审**:` 行及三份评审链接 | 无 → 缺失交叉引用 |
| 6 | §1.1 节 | 检查 01 是否包含 `### §1.1 User Operations` | 无 → 旧版文档 |
| 7 | §6 §7 节 | 检查 01 是否包含 `### §6` 和 `### §7` | 无 → 旧版文档 |
| 8 | §L 节 | 检查 01 是否包含 `### §L` | 无 → 缺失自改进循环 |
| 9 | data 约束 | 检查 01 §2 是否包含 `#### 数据约束` 子节 | 无 → 旧版 §2 |
| 10 | 扩展影响 | 检查 01 §3 是否包含 `#### 扩展影响分析` 子节（含 manifest.json / SW / Content Script / 存储 / 跨上下文五行） | 无 → 旧版 §3 |
| 11 | rui-state | 检查 `.memory/rui-state.json` 是否存在且为有效 JSON | 无 → 管线状态缺失 |
| 12 | 交叉引用 | 检查 02-08 之间是否有互链（各文件顶部是否有指向其他文档的链接） | 无 → 缺失交叉引用 |

检测完成后输出结构缺口清单，列出每项的状态（✅/❌）和缺口描述。

### 结构补齐规则

按缺口清单逐项补齐。补齐操作不改变已有内容，仅在缺失处追加或创建：

| # | 缺口 | 补齐操作 |
|---|------|---------|
| 1 | .improvement/ 缺失 | `mkdir -p`，创建空 `proposals.jsonl`（`echo '' > proposals.jsonl`） |
| 2 | .memory/ 缺失 | `mkdir -p`，创建空 `execution-memory.jsonl`，生成 `rui-state.json`（command=update, current_stage=结构补齐, pipeline_progress 按现有文档反推） |
| 3 | 02~08 缺失 | 从当前模板生成，以 01-故事任务.md 已有信息填充可推导内容。在文档顶部引用行添加 `> ⚠️ 由 rui update 结构补齐生成，需人工审核补充` |
| 4 | 版本头缺失 | 在 01 标题下方插入 `> \| v2（结构补齐） \| {当前日期} \| — \| — \| — \| — \|` |
| 5 | 证据标准缺失 | 在版本头下方插入 `> **证据标准**: A=已验证(附路径) · B=可推导(附规则) · C=未验证(标注 \`> 待补充\`) · D=禁止(视为幻觉)` |
| 6 | 技术评审链接缺失 | 在证据标准下方插入 `> **技术评审**: 详见 [02-后端技术评审.md](./02-后端技术评审.md) 和 [03-前端技术评审.md](./03-前端技术评审.md) 和 [04-测试用例评审.md](./04-测试用例评审.md)` |
| 7 | §1.1 缺失 | 从 §5 AC 和 §2 功能点推导 User Operations 表格。涉及 UI 时补充 mermaid 交互流程图、视图状态矩阵、交互追踪表（标注 `> 由 rui update 结构补齐生成，待人工确认`）。非 UI 故事标注「非 UI 故事，§1.1 仅含 User Operations」 |
| 8 | §6 缺失 | 添加 `### §6 .claude 改进清单` 占位，标注 `> 待 rui code 完成后由 pm 静态分析填充` |
| 9 | §7 缺失 | 添加 `### §7 系统架构演进任务` 占位，标注 `> 待 rui code 完成后由 pm 结构规划填充` |
| 10 | §L 缺失 | 添加 `### §L 自我改进循环` 占位，标注 `> 待 rui code 完成后由 self-improve-loop 自动追加` |
| 11 | §2 数据约束缺失 | 从 §2 功能点的输入/输出字段反推数据约束表（类型/范围/格式），标注 `> 由 rui update 结构补齐推导，待人工确认` |
| 12 | §3 扩展影响缺失 | 从 §4 Tasks 和代码结构反推扩展影响分析表（manifest / SW / Content Script / 存储 / 跨上下文），标注 `> 由 rui update 结构补齐推导，待人工确认` |
| 13 | rui-state 缺失 | 生成 rui-state.json：command=update, story_name=<name>, current_stage=结构补齐, pipeline_progress 按文档存在性反推（有 01→自适应规划/影响分析/架构设计/文档生成 completed，有 02-04→同上，有 05-07→预检/测试先行/实现/验证 completed，有 08→自改进 completed） |
| 14 | 交叉引用缺失 | 在 01 顶部添加三份评审链接；在 02 顶部添加 01+03+04 链接；在 03 顶部添加 01+02+04 链接；在 04 顶部添加 01+02+03 链接 |

> **补齐原则**：只补不漏——已有内容一字不改，缺失项按模板生成并标注来源。标注 `> 由 rui update 结构补齐` 的内容后续可由人工或下次 `/rui code` 的预检阶段完善。

### 变更分级规则

| 级别 | 触发示例 | 更新范围 |
|------|---------|---------|
| T1 微观 | 措辞修正、错别字、格式调整 | 仅变更章节 |
| T2 局部 | mock→真实接口替换、组件新增/删除、API 字段变更、测试用例补充 | 影响分析 → 更新受影响文档 + 下游引用 |
| T3 范围 | 故事边界变化、数据模型重构、跨故事接口变更 | 完整重跑文档管线（自适应规划→影响分析→架构设计→文档生成） |

### 上下文解析规则

`[context]` 有内容时，pm 解析补充信息，对照现有文档判定影响范围后进入变更分级。

`[context]` 为空时（仅结构补齐后或单独 `/rui update <name>`），pm 扫描故事文档给出优化建议：
- 检查 01 §3 Design 与实际代码的偏差（如有代码）
- 检查技术评审之间的交叉引用一致性
- 扫描文档中的 `> 待补充` / `TODO` / `FIXME` / `> 由 rui update 结构补齐` 标注
- 扫描 `.improvement/proposals.jsonl` 中 open 状态的关联提案
- 有优化建议时按 T1/T2 执行增量更新，无建议时跳过增量更新直接交付

### 示例

```bash
# 老故事升级到最新流程（无上下文，自动检测+补齐+扫描优化）
/rui update old-feature

# 补充后端接口信息，替换前端 mock
/rui update user-login "后端接口已就绪：POST /api/auth/login → {token, user}，需替换 src/mocks/auth.ts"

# 需求微调，新增字段
/rui update user-login "登录表单增加「记住我」复选框，影响 LoginForm 组件和 auth store"

# 老故事升级 + 内容更新（先补齐结构，再应用上下文）
/rui update old-payment "支付流程从同步改为异步，需更新 §3 Design 数据流和 §2 业务规则"
```

---

## /rui code \<name\>

预检（含文档补齐）→ 测试先行 → 实现 → 验证 → 自改进 → 交付。01-故事任务.md 必须存在；缺失的基线文档在预检阶段自动补齐，确保最终产出故事目录全文档（模板基线 + 故事拓展）。

```mermaid
flowchart TD
    PRECHECK["预检<br/>影响分析 + 分支隔离 + 文档补齐"] --> TESTFIRST["测试先行<br/>测试方案 + 原型"]
    TESTFIRST --> GA{Gate A}
    GA -->|PASS| IMPL["实现<br/>逐模块编码 + P0 审查"]
    GA -->|FAIL| FIX1[修复]
    FIX1 --> GA
    IMPL --> VERIFY["验证<br/>冒烟 + 影响链回归"]
    VERIFY --> GB{Gate B}
    GB -->|PASS| SYNC_CP2["import-docs CP2<br/>05-07 报告同步"]
    GB -->|FAIL ≤2 轮| FIX2[修复]
    FIX2 --> GB
    GB -->|>2 轮| BLOCK[阻断: H7]
    SYNC_CP2 --> SELF["自改进<br/>self-improve-loop"]
    SELF --> DELIVER[交付]
```

| 阶段 | 做什么 | 关键产出 |
|------|--------|---------|
| 预检 | 双边影响分析 + 分支隔离（从 main 拉取 `feat/<name>`）+ **文档补齐**（缺失的基线文档自动生成，保证故事目录全文档）<br>必须从 main 分支创建<br>coder, pm, reporter | 功能分支 + 双边影响链闭合 + 补齐的技术评审 |
| 测试先行 | Gate A：测试方案+原型，单行 CSS 可跳过<br>Gate A 未过不得编码<br>tester | 04-测试用例评审.md（若预检已补齐则跳过） |
| 实现 | 逐模块编码，每模块后审查：P0 必须修 / P1 建议修 / P2 可选<br>P0 未清零不进下一模块<br>coder, security, tester | 源代码（按 §4 任务列表）+ P0 清零 |
| 验证 | Gate B：环境快照 → 静态预检 → 对齐 → 单次执行 → 三报告产出<br>三报告相互引用闭合，各报告评审清单全部 ✅ 方可通过 Gate B<br>超过 2 轮修复阻断（H7）<br>coder（后端/前端实施报告）, tester（测试用例报告）, reporter（审阅） | 05-后端实施报告.md、06-前端实施报告.md、07-测试用例报告.md |
| 文档同步 CP2 | **import-docs 强制同步**：05-07 实施/测试报告产出后立即调用 `Skill(import-docs, --workspace)` 推送到远端。 | rui 系统 |
| 自改进 | self-improve-loop：效果评估 + 基线配置复盘 + 回顾 → `loop.js run --all`<br>产出08-自改进复盘.md<br>pm, reporter, self-improve | 08-自改进复盘.md |

**最终产出保证：** 故事目录下全文档 + 数据存储齐全——模板基线（01-故事任务.md 前置 + 02-后端技术评审.md + 03-前端技术评审.md + 04-测试用例评审.md + 05-后端实施报告.md + 06-前端实施报告.md + 07-测试用例报告.md + 08-自改进复盘.md）+ 故事拓展文档（10+ 按需）+ `.improvement/proposals.jsonl` + `.memory/`（execution-memory.jsonl + rui-state.json）。

### 验证与报告产出

验证阶段产出三份报告，作为 Gate B 通过证据。三报告共享故事上下文，相互引用、交叉验证。

```mermaid
flowchart TD
    ENV["环境快照<br/>git commit + 浏览器版本 + 数据状态"] --> STATIC["静态预检<br/>代码 vs 技术评审逐项比对"]
    STATIC --> ALIGN["对齐<br/>偏差归因：需求变更/技术限制/优化"]
    ALIGN --> EXEC["单次执行<br/>冒烟 + 回归 + Extension 专项"]
    EXEC --> RPT_BACKEND["05-后端实施报告.md<br/>coder"]
    EXEC --> RPT_FRONTEND["06-前端实施报告.md<br/>coder"]
    EXEC --> RPT_TEST["07-测试用例报告.md<br/>tester"]
    RPT_BACKEND --> CROSS{"交叉验证<br/>三报告相互引用闭合"}
    RPT_FRONTEND --> CROSS
    RPT_TEST --> CROSS
    CROSS -->|"各报告评审清单全部 ✅"| GB_PASS["Gate B PASS"]
    CROSS -->|"任一项 ❌"| FIX["修复 → 重跑验证"]
    FIX --> EXEC
```

#### 05-后端实施报告.md

| 维度 | 要求 |
|------|------|
| 负责人 | coder |
| 输入 | 02-后端技术评审.md（接口清单、消息通道、数据模型、安全约束）、实际代码、P0 审查记录 |
| 核心章节 | §1 实施总结（交付文件 + 实际接口 + 消息通道比对）、§2 偏差记录（评审 vs 实际，P0 偏差须含风险评估）、§3 P0 审查结果（逐模块清零表 + 安全缓解对照）、§4 存储变更（迁移验证）、§5 性能观察、§6 评审清单（7 项全 ✅） |
| 完成标准 | 评审清单 7 项全部 ✅；所有交付文件与 §4 任务列表一一对应；P0 偏差均已说明原因和风险；无硬编码密钥或敏感信息 |

#### 06-前端实施报告.md

| 维度 | 要求 |
|------|------|
| 负责人 | coder |
| 输入 | 03-前端技术评审.md（组件表、Hooks 模式、样式隔离、加载顺序）、实际代码、P0 审查记录 |
| 核心章节 | §1 实施总结（交付文件 + 实际组件 + 状态管理比对）、§2 偏差记录（评审 vs 实际，P0 偏差须含风险评估）、§3 P0 审查结果（逐模块清零表）、§4 样式与隔离（作用域前缀验证）、§5 依赖与加载（manifest.json 变更 + 加载顺序验证）、§6 评审清单（9 项全 ✅） |
| 完成标准 | 评审清单 9 项全部 ✅；组件 IIFE 封装、命名空间正确；样式使用作用域前缀无宿主污染；manifest.json 按依赖顺序排列；无 ES module 语法 |

#### 07-测试用例报告.md

| 维度 | 要求 |
|------|------|
| 负责人 | tester |
| 输入 | 04-测试用例评审.md（用例清单）、01-故事任务.md §3（影响链回归范围）、05-后端实施报告.md、06-前端实施报告.md |
| 核心章节 | §1 测试环境（含 git commit hash）、§2 冒烟测试（P0 正常 + 关键边界，含通过率汇总）、§3 回归测试（范围与 §3 影响链一致）、§4 Extension 专项（SW 休眠/消息通道/存储迁移）、§5 已知问题（P0 阻断交付，>2 轮修复触发 H7）、§6 Gate B 评估、§7 评审清单（6 项全 ✅） |
| 完成标准 | 评审清单 6 项全部 ✅；P0 用例通过率 100%；P1 用例通过率 ≥80%；P0 已知问题为 0；修复轮次 ≤2；回归范围与影响链闭合 |

> **三报告交叉验证**：测试用例报告 §2 引用后端/前端实施报告的交付文件列表，确认测试覆盖所有交付物；后端/前端实施报告的偏差记录若涉及接口契约变更，测试用例报告须有对应边界用例覆盖。

### 自改进管线

代码管线完成后单次执行，不阻断主流程。脚本位于 `skills/rui/scripts/`。

```mermaid
flowchart LR
    CODE_DONE["代码管线完成"] --> SI["自改进管线"]
    SI --> ARCH["六维推演 → 架构指标"]
    SI --> FLOW["趋势分析 → 工流指标"]
    SI --> LOOP["效果评估 + 回顾"]

    ARCH --> STORE[("proposals.jsonl<br/>.memory/")]
    FLOW --> STORE
    LOOP -->|loop.js run --all| STORE
```

| 操作 | 脚本 | 产出 |
|------|------|------|
| 架构反思 | `self-improve.js` | 六维推演，架构指标 |
| 工流诊断 | `self-improve.js` | 趋势分析，工流指标 |
| 效果评估 + 回顾 | `loop.js run --all` | 08-自改进复盘.md |

数据存储: `docs/故事任务面板/<name>/.improvement/proposals.jsonl` + `docs/故事任务面板/<name>/.memory/`，append-only。

---

## /rui \<requirement\>（端到端）

从需求输入（文本 / @文件 / URL）拆分故事，逐故事串行走完文档管线（自适应规划→影响分析→架构设计→文档生成）和代码管线（预检→测试先行→实现→验证→自改进），中间不中断，完成或阻断后输出下一步提示。

```mermaid
flowchart TD
    INPUT["需求输入<br/>文本 / @文件 / URL"] --> PARSE["需求解析"]
    PARSE --> SPLIT["故事拆分<br/>每个故事 = 一个功能单元"]
    SPLIT --> S1["故事 1<br/>文档管线 → 代码管线 → 交付"]
    S1 --> S1D["✓ 故事 1 交付"]
    S1D --> S2["故事 2<br/>文档管线 → 代码管线 → 交付"]
    S2 --> S2D["✓ 故事 2 交付"]
    S2D --> SN["..."]
    SN --> SND["✓ 故事 N 交付<br/>全部故事端到端完成"]
```

等同于 `/rui doc <requirement>` + 每个故事 `/rui code <name>` 的全自动串联。每个故事目录产出全文档（模板基线 + 故事拓展）+ `.improvement/proposals.jsonl` + `.memory/`。

---

## /rui list

列出所有未完成的故事任务及其进度状态。不执行任何管线，纯查询操作。

扫描 `docs/故事任务面板/` 下所有故事目录，检查每个故事的产出文件完整性，输出进度表格。

| 故事 | 状态 | 缺失产出 |
|------|------|---------|
| user-login | 文档完成，待编码 | 后端实施报告、前端实施报告、测试用例报告 |
| oauth-bindding | 文档进行中 | 后端技术评审、前端技术评审、测试用例评审 |
| chat-export | 未开始 | 01-故事任务.md、全部技术评审 |

**状态判定规则**（按优先级，取最低阶段的未完成状态）：

| 状态 | 判定条件 |
|------|---------|
| 未开始 | `01-故事任务.md` 不存在 |
| 文档进行中 | `01-故事任务.md` 存在，但技术评审（后端/前端/测试用例）任一缺失 |
| 文档完成 | `01-故事任务.md` + 三份技术评审齐全，实施报告缺失 |
| 代码进行中 | 文档齐全，但三份实施报告任一缺失 |
| 代码完成 | 三份实施报告齐全 |
| 阻断 | `.memory/rui-state.json` 中 `blocked: true` |

仅当存在至少一个未完成故事时输出表格；若全部代码完成，输出简要完成提示。存在阻断状态的故事时，额外输出阻断原因。

实现：`node skills/rui/scripts/list.js`

---

## /rui（空输入）

当 `/rui` 无任何参数或输入为空时，不执行管线，而是扫描项目状态和已有故事进度，推荐 5~10 条可执行的任务提示。

### 推荐生成规则

pm 扫描以下信息源，综合生成推荐：

| 扫描源 | 提取信息 |
|--------|---------|
| `docs/故事任务面板/` | 已有故事及其进度状态（调用 list 判定逻辑） |
| `CLAUDE.md` + `README.md` | 项目技术栈、编码规范、禁止事项 |
| Git log（最近 10 条） | 近期活跃的故事和改动方向 |
| `.memory/` 下的 rui-state.json | 阻断状态、变更级别记录 |
| 各故事目录下的 `01-故事任务.md` §6 §7 §L | 改进清单、架构演进任务、自改进建议 |

### 推荐分类

每条推荐标注类型和理由来源：

| 类型 | 说明 | 示例 |
|------|------|------|
| 代码文档化 | 有源码但无对应故事文档 | `rui doc --from-code <requirement>` 从代码反推故事全文档（只读） |
| 文档补齐 | 01 存在但基线文档不全（02-08 有缺失） | `rui code --from-doc <name>` 从 01 生成缺失的基线文档（只读） |
| 文档补充 | 技术评审存在但章节不完整 | `rui update <name>` 补齐后端技术评审的 API 错误码表 |
| 代码实现 | 文档齐全待编码 | `rui code <name>` |
| 优化改进 | §6/§L 中积压的改进项 | `rui update <name> "优化登录表单验证逻辑"` |
| 端到端 | 全新需求可启动完整管线 | `rui <requirement>` |
| 架构演进 | §7 中规划的架构任务 | `rui update <name> "拆分 auth 模块为独立 service"` |

### 输出格式

```
🧭 rui 任务推荐（共 N 条）

1. [类型] /rui code user-login
   理由: 文档齐全（基线 + 拓展），P0 审查待执行 | 来源: list 扫描

2. [类型] /rui update chat-export "补充导出进度回调接口"
   理由: §6 改进清单积压 | 来源: 01-故事任务.md §6

...
```

若项目尚无任何故事（`docs/故事任务面板/` 为空或不存在），则推荐从 `/rui init` 或 `/rui doc <requirement>` 开始，并根据 CLAUDE.md/README.md 推测 2~3 个可能的需求方向作为示例。

---

## 数据契约

三个数据文件支撑 rui 的记忆与改进引擎。每个故事独立存储，全局聚合用于跨故事分析。

### 存储路径

```
docs/故事任务面板/<name>/
├── .improvement/
│   └── proposals.jsonl         ← 改进提案（per-story + 全局同步）
└── .memory/
    ├── execution-memory.jsonl  ← 执行记忆（per-story + 全局同步）
    └── rui-state.json          ← 管线状态（per-story + 全局同步）

docs/                           ← 全局聚合（跨故事查询）
├── .improvement/
│   ├── proposals.jsonl
│   └── .last-health.json
└── .memory/
    ├── execution-memory.jsonl
    └── rui-state.json
```

写入规则：指定 `--name` 时双写（per-story + 全局）；未指定时仅写全局（向后兼容）。跨故事分析（`stats`/`trends`/`health`/`retro`）读取全局路径。

### execution-memory.jsonl

追加写入，每行一个 JSON 对象。记录每次 rui 执行的完整上下文。

| 字段 | 类型 | 描述 |
|------|------|------|
| session_id | string | 唯一会话标识 |
| timestamp | ISO 8601 | 记录时间 |
| story_name | string | 所属故事（`--name` 时写入） |
| feature | string | 故事/功能名称 |
| description | string | 执行描述 |
| planned_change_level | T1\|T2\|T3 | 计划变更级别 |
| actual_change_level | T1\|T2\|T3 | 实际变更级别 |
| phase_transitions | array | `[{from, to, timestamp, duration_ms}]` 阶段转换时间线 |
| update_context | string\|null | update 命令的补充上下文 |
| agents_called | string[] | 调用的 agent 列表 |
| quality_issues | object | `{P0:[{doc_type, section, issue}], P1, P2}` 质量问题 |
| bad_cases | array | `[{agent, lesson}]` 教训记录 |
| was_blocked | boolean | 是否触发阻断 |
| block_reason | string | 阻断原因 |

**消费方**：`/rui update` 查询历史相似案例指导增量更新；`/rui`（空输入）扫描近期 P0 问题生成改进建议；`self-improve.js trends` 分析退化趋势。

### rui-state.json

单对象 JSON 文件。记录当前管线状态和变更历史。

| 字段 | 类型 | 描述 |
|------|------|------|
| session_id | string | 当前会话标识 |
| command | string | 触发命令（init/doc/update/code/full） |
| name / story_name | string | 故事名称 |
| current_stage | string | 当前所处阶段 |
| blocked | boolean | 是否阻断 |
| block_reason | string\|null | 阻断原因 |
| timestamp | ISO 8601 | 最后更新时间 |
| storyboard | string | 故事任务文件路径 |
| pipeline_progress | object | `{"自适应规划":"completed", "影响分析":"completed", ...}` 每阶段状态：completed / in_progress / blocked / not_started |
| change_history | array | `[{timestamp, from_stage, to_stage, trigger}]` 阶段变更时间线 |
| related_proposals | string[] | 关联的 proposal ID 列表 |

**消费方**：`/rui list` 读取 pipeline_progress 判定故事进度；`/rui`（空输入）读取 blocked 阶段推荐恢复命令；`rui-state.js next-step` 基于完成阶段推荐下一步。

### all-modules.json

单对象 JSON 文件。记录 `--all` 模式的模块级进度。

| 字段 | 类型 | 描述 |
|------|------|------|
| session_id | string | 当前 `--all` 会话标识 |
| started_at | ISO 8601 | `--all` 启动时间 |
| updated_at | ISO 8601 | 最后更新时间 |
| status | string | 整体状态：`in_progress` / `completed` / `blocked` / `abandoned` |
| modules | array | 模块列表 |

**modules 数组元素**：

| 字段 | 类型 | 描述 |
|------|------|------|
| name | string | 模块英文名（如 `auth-system`） |
| description | string | 模块功能描述（2-5 句） |
| source_dirs | string[] | 模块涉及的源码目录/文件路径 |
| order | number | 模块处理顺序 |
| status | string | 模块状态：`pending` / `in_progress` / `completed` / `blocked` |
| block_reason | string\|null | 阻断原因（仅 blocked 状态） |
| stories_created | string[] | 该模块生成的故事目录名列表 |
| started_at | ISO 8601\|null | 模块开始处理时间 |
| completed_at | ISO 8601\|null | 模块完成时间 |

**消费方**：`rui init --all` 检查文件决定是否断点续传；`rui-state.js all-status` 输出进度表；`/rui`（空输入）读取模块进度生成推荐。

### proposals.jsonl

追加写入，每行一个 JSON 对象。记录自改进引擎生成的改进提案。

| 字段 | 类型 | 描述 |
|------|------|------|
| id | string | 唯一提案标识 |
| date | YYYY-MM-DD | 创建日期 |
| title | string | 提案标题 |
| type | string | 提案类型（refactor/perf/security/quality/process） |
| priority | P0\|P1\|P2\|P3 | 优先级 |
| status | open\|done\|superseded | 状态 |
| trigger_op | string | 触发操作 |
| story_name | string\|null | 所属故事 |
| source_phase | string\|null | 生成此提案的管线阶段 |
| actionable_command | string\|null | 可执行 rui 命令，如 `/rui update user-login "..."` |
| linked_memory_ids | string[] | 关联的 execution-memory session_id |
| problem_source | string | 问题来源 |
| evidence | string | 证据描述 |
| current_state | string | 当前状态描述 |
| target_state | string | 目标状态描述 |
| s1_metrics | object | 六维架构指标 |
| s2_metrics | object | 工流趋势指标 |
| feedback | array | `[{rating, note, date}]` 用户反馈 |
| eval_result | improved\|degraded\|neutral\|pending\|null | 效果评估结果 |

**消费方**：`/rui`（空输入）读取 open 状态提案生成「优化改进」「架构演进」类推荐；`/rui update` 查找关联提案辅助上下文解析；`loop.js run` 读取提案生成 §L 自改进循环章节。

### 数据流

```mermaid
flowchart LR
    RUI["/rui 命令执行"] --> EM["execution-memory.jsonl<br/>记录执行上下文"]
    RUI --> STATE["rui-state.json<br/>更新管线进度"]
    
    EM --> SI["self-improve.js<br/>趋势分析 + 效果评估"]
    STATE --> SI
    
    SI --> PROPOSAL["proposals.jsonl<br/>生成改进提案"]
    
    PROPOSAL --> SUGGEST["/rui（空输入）<br/>读取提案 + 状态 → 推荐任务"]
    EM --> SUGGEST
    STATE --> SUGGEST
    
    PROPOSAL --> UPDATE["/rui update<br/>查询历史案例 → 增量更新"]
    EM --> UPDATE
    
    PROPOSAL --> LOOP["loop.js run<br/>生成 §L 自改进循环"]
    EM --> LOOP
```

---

## 交付与文档同步

### import-docs 多检查点强制同步

import-docs 是管线强制步骤，**不仅在交付阶段触发，而是在多个检查点独立执行**：

| 检查点 | 触发时机 | 同步范围 | 失败处理 |
|--------|---------|---------|---------|
| CP1 文档生成后 | 01-08 基线文档产出后立即触发 | 当前故事目录全部 .md + .claude/ 全部文件 | H9: API_X_TOKEN 缺失时跳过；网络/权限失败记录告警，下次 rui 运行时覆盖重试 |
| CP2 验证后 | 05-07 实施/测试报告产出后立即触发 | 当前故事目录全部 .md + .claude/ 全部文件 | 同 CP1 |
| CP3 交付阶段 | 管线末端，自改进完成后 | 全项目全量 .md + .claude/ 全部文件（最终同步） | 同 CP1 |

> **核心原则：文档产出即同步。** 不等待管线末端——每个阶段的文档一旦生成就立即推送到远端。网络抖动导致的单次失败不阻断管线，下次 rui 运行时新文件覆盖旧版本。API_X_TOKEN 缺失是唯一合法的跳过条件。

### 交付阶段自动触发

所有命令的末端，rui **自动触发**以下技能，不等待用户指令：

| Step | 技能 | 触发方式 | 失败处理 |
|------|------|---------|---------|
| 1 | wework-bot | `Skill(wework-bot, --no-send --name <name>)` — 追加消息日志 | 不可跳过 |
| 2 | import-docs | `Skill(import-docs, --workspace)` — CP3 最终全量同步 | H9: API_X_TOKEN 缺失时跳过 |
| 3 | wework-bot | `Skill(wework-bot, --name <name>)` — 发送完成/阻断通知 | 不可跳过 |

> **自动触发**: rui 到达交付阶段时，不询问用户，直接调用 Skill 工具依次触发上述技能。

消息格式（纯文本，emoji 前缀，`———` 分隔）：

```
🎯 结论: 完成 user-login 文档管线
📝 描述: 为登录模块生成故事板，覆盖密码登录、短信验证码、OAuth 三种场景
📌 范围: auth/
👉 下一步: 运行 /rui code user-login 开始编码实现
🌐 影响: docs/故事任务面板/user-login/01-故事任务.md
📎 证据: git log --oneline -1
⏱️ 会话: 自适应规划→策展 全流程 3.2min | 3 agents 参与

———
变更文件: docs/故事任务面板/user-login/01-故事任务.md (新增, 285行)
```

完成或阻断后同时向用户输出下一步提示。字段要求见 wework-bot SKILL.md。

---

## 文档规范

```
<workspace-root>/
└── docs/
    └── 故事任务面板/
        └── <name>/              ← 故事目录（简写，便于分支管理）
            ├── 01-故事任务.md      ← 唯一真相源
            ├── 02-后端技术评审.md
            ├── 03-前端技术评审.md
            ├── 04-测试用例评审.md
            ├── 05-后端实施报告.md
            ├── 06-前端实施报告.md
            ├── 07-测试用例报告.md
            ├── 08-自改进复盘.md
            │
            │   ← 以上 01~08 为模板基线（最小集）
            │   ← 以下为交付产物与故事拓展
            │
            ├── 09-消息通知列表.md   ← 由 wework-bot 自动生成，不属基线模板
            ├── 10-{领域}.md         ← 例: 10-页面设计.md / 10-数据迁移方案.md / 10-API契约文档.md
            ├── 1x-{专题}.md         ← 例: 11-性能基准.md / 12-权限模型.md
            ├── ...
            ├── .improvement/
            │   └── proposals.jsonl
            └── .memory/
                ├── execution-memory.jsonl
                └── rui-state.json
```

### 全文档概念

**模板是最小集，不是上限。** 01~08 覆盖所有故事共通的基线文档（09-消息通知列表.md 由交付阶段 wework-bot 自动生成，不属文档管线产出）。全文档 = 模板基线 + 补充文档（09+10+ 按需拓展）。

补充文档按故事的实际内容、复杂度、领域特征生成：

| 故事特征 | 补充文档示例 |
|---------|-------------|
| 涉及 UI 改造（01 §1.1 有视图状态矩阵） | `10-页面设计.md` — 页面清单、组件构成、响应式策略 |
| 涉及新增/修改 API 端点 | `11-API契约文档.md` — 端点清单、请求/响应示例、错误码表 |
| 涉及数据存储结构变更 | `12-数据迁移方案.md` — 迁移步骤、回滚策略、数据校验 |
| 性能敏感 | `13-性能基准.md` — 基准测试方法、目标指标、实测数据 |
| 权限/安全 | `14-权限模型.md` — 角色矩阵、权限边界、审计日志设计 |
| 部署变更 | `15-部署运维手册.md` — 环境变量、构建配置、健康检查 |
| 第三方集成 | `16-集成方案.md` — 外部服务依赖、认证配置、回退策略 |

> 补充文档的编号从 10 开始连续递增（09 固定为消息通知列表），编号不代表优先级——仅用于保证文件列表有序。pm 在文档生成阶段（`--full` 模式下）按决策表判断是否需要补充文档，coder/tester/security 协同产出。

### 补充文档生成规则

pm 在文档生成阶段（`--full` 模式）按以下决策表判断是否需要生成补充文档：

| 判断条件 | 生成文档 | 模板 | 负责人 |
|---------|---------|------|--------|
| 01 §1.1 涉及 UI 改造（有视图状态矩阵） | 页面设计文档 | `补充-页面设计模板.md` | coder |
| 01 §2 功能点涉及新增/修改 API 端点 | API 契约文档 | `补充-API契约模板.md` | coder |
| 01 §2 功能点涉及新增/修改数据存储结构 | 数据迁移方案 | `补充-数据迁移方案模板.md` | coder |
| 故事涉及第三方服务集成 | 集成方案 | 按页面设计模板模式生成 | coder + security |
| 故事引入新的权限控制 | 权限模型 | 按页面设计模板模式生成 | security |
| 故事涉及性能敏感路径 | 性能基准 | 按页面设计模板模式生成 | coder |

> 无匹配条件时不生成补充文档。有模板的优先使用模板，无模板的按已有模板模式（版本信息行 + 关联链接 + 内容节 + 评审清单）ad-hoc 生成。
> 补充文档仅在 `--full` 模式下生成——标准模式产出 01-08 基线即止。


### 故事板章节

| 章节 | 负责人 | 内容 |
|------|--------|------|
| §1 Story | pm | 角色场景、价值、范围边界、依赖 |
| §1.1 User Operations | tester | 用户操作 + UI交互流程 |
| §2 Requirements | pm | 功能点、输入输出、错误行为、业务规则 |
| §3 Design | coder + security | 设计概述 + 设计决策 |
| §4 Tasks | pm + all | 任务拆解、依赖、交付物 |
| §5 Acceptance Criteria | tester | 验收标准、测试方法、预期结果 |
| §6 .claude 改进清单 | pm | skill/agent/rule/script/config 改进（文档生成/策展阶段静态分析） |
| §7 系统架构演进任务 | pm | 近期/中期/远期演进（架构设计/策展阶段结构规划） |
| §L 自我改进循环 | self-improve-loop | 数据驱动改进清单 + 架构演进（每次 rui 完成追加） |

> §6 §7 由 pm 在文档生成阶段写入（结构性）。§L 由 self-improve-loop 在每次 rui 完成时自动追加（数据驱动）。两者互补。

### 故事目录基线文件

以下为模板基线文件（最小集，所有故事通用）。全文档在此基础上按故事内容拓展，拓展规则见上文「全文档概念」。

| 文件 | 负责人 | 内容 | 产出阶段 |
|------|--------|------|---------|
| 02-后端技术评审.md | coder + security | 后端技术方案评审，覆盖 Service Worker、消息通道、API 接口、存储模型、安全约束 | 文档生成（架构设计后） |
| 03-前端技术评审.md | coder | 前端技术方案评审，覆盖组件树、Hooks 状态管理、交互细节、样式隔离、加载顺序 | 文档生成（架构设计后） |
| 04-测试用例评审.md | tester | 测试用例完整性评审，覆盖功能、边界、异常、回归用例 | 文档生成（架构设计后） |
| 05-后端实施报告.md | coder | 后端实现总结：交付文件清单 → 实际接口 vs 评审比对 → 消息通道比对 → 偏差记录（P0 含风险评估）→ 逐模块 P0 审查清零 → 安全缓解对照 → 存储变更与迁移验证 → 性能观察 → 7 项评审清单 | 验证 |
| 06-前端实施报告.md | coder | 前端实现总结：交付文件清单 → 实际组件 vs 评审比对 → 状态管理比对 → 偏差记录（P0 含风险评估）→ 逐模块 P0 审查清零 → 样式隔离验证 → manifest.json 变更 + 加载顺序验证 → 9 项评审清单 | 验证 |
| 07-测试用例报告.md | tester | 测试执行报告：环境快照（含 commit hash）→ 冒烟测试 + P0/P1 通过率 → 影响链回归 → Extension 专项验证 → 已知问题（P0 阻断，>2 轮 H7）→ Gate B 评估 → 6 项评审清单。引用后端/前端实施报告，交叉验证覆盖所有交付物 | 验证 |
| 08-自改进复盘.md | pm + reporter | 本次故事全过程复盘，覆盖执行记忆回望、基线配置复盘、改进项、经验沉淀 | 自改进 |

---

## 阻断

| # | 场景 | 降级 | 阶段 |
|---|------|------|------|
| H1 | 需求无法解析（空输入/文件不存在/URL不可达） | 否 | 需求解析 |
| H2 | P0 章节缺少上游来源 | 否 | 文档生成, 预检 |
| H3 | 影响链无法闭合 | 否 | 影响分析, 预检 |
| H4 | 文档 P0 不通过且无法自修复 | 否 | 文档生成 |
| H5 | 代码审查 P0 无法修复 | 否 | 实现 |
| H6 | Gate A 未完成但已编码 | 否 | 测试先行→实现 |
| H7 | Gate B >2 轮修复未通过 | 否 | 验证 |
| H8 | 所有模块被阻断 | 否 | 实现 |
| H9 | `API_X_TOKEN` 缺失 | 是 | 交付 |
| H10 | 功能分支未从 main 创建 | 否 | 预检 |
| H11 | self-improve-loop 数据采集失败 | 是 | 自改进 |
| H12 | 功能分支被自动合并到 main | 否 | 预检→交付 |

阻断后: `rui-state.js save --blocked` → `next-step` → 持久化 → 同步（H9/H11 跳过）→ 通知。

---

## 集成点

- **自改进**: `node skills/rui/scripts/self-improve.js <cmd>`
- **自改进循环**: `node skills/rui/scripts/loop.js run --all`
- **执行记忆**: `node skills/rui/scripts/execution-memory.js`
- **断点**: `node skills/rui/scripts/rui-state.js <save|load|clear>`
- **列表**: `node skills/rui/scripts/list.js`
- **--all 状态**: `node skills/rui/scripts/rui-state.js all-init|all-module-done|all-module-blocked|all-status`
- **文档同步**: `Skill(import-docs, --workspace)`（rui 自动触发）
- **通知**: `Skill(wework-bot, --name <story-name>)`（rui 自动触发）
- **.claude 管理**: `Skill(rui-claude, sync|diff)`（独立技能）
- **Agent**: [`agents/AGENT.md`](../../agents/AGENT.md)
- **模板**: [`templates/故事任务模板.md`](templates/故事任务模板.md) · [`templates/后端技术评审模板.md`](templates/后端技术评审模板.md) · [`templates/前端技术评审模板.md`](templates/前端技术评审模板.md) · [`templates/测试用例评审模板.md`](templates/测试用例评审模板.md) · [`templates/后端实施报告模板.md`](templates/后端实施报告模板.md) · [`templates/前端实施报告模板.md`](templates/前端实施报告模板.md) · [`templates/测试用例报告模板.md`](templates/测试用例报告模板.md) · [`templates/自改进复盘模板.md`](templates/自改进复盘模板.md)
- **规则**: [`rules/doc-generation.md`](rules/doc-generation.md) · [`rules/code-pipeline.md`](rules/code-pipeline.md) · [`rules/gate-rules.md`](rules/gate-rules.md) · [`rules/self-improve.md`](rules/self-improve.md)
