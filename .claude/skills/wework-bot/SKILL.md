---
name: wework-bot
description: 发送企业微信机器人消息，用于 generate-document、implement-code 或其他长流程的监控预警、阶段通知和动态观测。用户提到企业微信机器人、wework、webhook、预警、监控通知或 send-message 时使用。
---

# wework-bot

## 定位

`wework-bot` 是 YiWeb 的企业微信机器人通知技能。它负责把阶段状态、阻断原因、验证结果或人工介入请求发送到企业微信群机器人，并支持按 agent 路由到不同机器人。

## 何时使用

- `generate-document` 生成文档开始、完成、阻断或自检失败时需要通知
- `implement-code` 阶段门禁、代码实施、冒烟测试、阻断总结需要动态观测
- 用户明确要求发送企业微信机器人消息
- 需要把长流程状态推送到外部群聊

## 输入

### 路由与认证

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `token` | `API_X_TOKEN` | `https://api.effiy.cn` 的 `X-Token` |
| `apiUrl` | `https://api.effiy.cn/wework/send-message` | 发送消息 API |
| `config` | `WEWORK_BOT_CONFIG` 或 `.claude/skills/wework-bot/config.local.json`（存在时自动加载） | 多机器人路由配置 JSON |
| `agent` | 无 | agent 名称，用于从配置中选择机器人 |
| `robot` | 配置默认值 | 机器人名称，优先级高于 `agent` |
| `webhookUrl` | `WEWORK_WEBHOOK_URL` | 完整企业微信机器人 webhook |
| `webhookKey` | `WEWORK_WEBHOOK_KEY` | 企业微信机器人 key，可自动拼接 webhook |

### 内容与描述

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `content` | 无 | 消息正文（一句话结论或完整多行电梯块） |
| `description` | 无 | 消息描述，必填，100 字以内；也可写在正文的 `📝 描述：...` 行 |
| `contentFile` | 无 | 从文件读取消息正文 |
| `conclusion` | 无 | 显式指定 `🎯 结论` 行；当 `content` 已经是多行块时强制覆盖结论 |

### 上下文字段

| 参数 | 默认值 | 写入字段 | 说明 |
|------|--------|---------|------|
| `flow` | 无 | `🛠️ 流程` | 流程名，如 `implement-code` / `generate-document` |
| `feature` | 无 | `📌 功能` | 功能名或文档路径 |
| `stage` | 无 | `📍 阶段` | 当前阶段 |
| `status` | 无 | `📊 状态` | 当前状态：开始 / 通过 / 阻断 / 失败 / 需要人工介入 |
| `docType` | 无 | `📋 类型` | `generate-document` 专用，文档类型 |
| `p0Pass` + `p0Total` | 无 | `🧪 P0 检查项` | P0 通过数 / 总数 |
| `gateName` | 无 | `🔍 门禁` | 门禁阶段或名称 |
| `gateResult` | 无 | `📊 结果` | 门禁结果，如 `通过 N / 失败 M / 未执行 K` |
| `reason` | 无 | `❌ 原因` | 失败 / 阻断原因（≤ 2 条） |
| `impact` | 无 | `🌐 影响` | 用户可见影响、交付范围或阻断影响 |
| `evidence` | 无 | `📎 证据` | 证据路径、命令、MCP 调用序列或结果摘要 |
| `reportPath` | 无 | `📂 报告` | 报告或总结文件路径 |
| `recover` | 无 | `🧭 恢复点` | 阻断 / 门禁失败时的恢复路径 |
| `nextStep` | 默认恢复建议 | `👉 下一步` | 接收者下一步动作 |

### 业务度量字段（让推送内容更详细）

| 参数 | 默认值 | 写入字段 | 说明 |
|------|--------|---------|------|
| `duration` | 无（脚本可写入缺省说明） | `⏱️ 用时` | **必含**：本次会话耗时；如 `12m 34s` 或 `01:23:45`；未记时/未传参时脚本注入「未在本地记录，请从 Cursor 会话起止时间核对」 |
| `startedAt` | 无 | `🟢 开始时间` | 任务开始时间，`YYYY-MM-DD HH:mm:ss` |
| `aiCalls` | 无 | `🤝 AI 调用` | AI 调用统计，如 `skills 7 / agents 4 / mcp 23 / tools 86` |
| `callChain` | 无 | `🔗 调用链` | 紧凑调用链，如 `find-skills→find-agents→...→wework-bot` |
| `testPaths` | 无 | `📁 测试路径` | 测试路径门禁结论，如 `tests/ 内 12 spec / 5 page，无逸出` |
| `testStats` | 无 | `🧫 测试统计` | 测试用例统计，如 `spec 12 / case 47 / 通过 47 / 失败 0` |
| `retries` | 无 | `🔁 修复轮次` | 自修复轮次，如 `阶段2: 1 轮 / 阶段6: 0 轮` |
| `artifacts` | 无 | `📦 产物` | 产物统计，如 `代码 8 / 测试 12 / 文档 6` |
| `metrics` | 无 | `📈 指标` | 其它度量，如 `lint 0 / 影响链命中 23` |
| `syncResult` | 无 | `☁️ 文档同步` | `import-docs` 真实结果，如 `docs → YiAi（创建 6，覆盖 0，失败 0）` |
| `branch` | `git rev-parse --abbrev-ref HEAD`（自动检测） | `🌿 分支` | Git 分支名，未自动检测到时为空 |
| `commit` | `git rev-parse --short HEAD`（自动检测） | `🔖 提交` | Git short commit，未自动检测到时为空 |
| `diagramSummary` | 无 | `📐 实施总结图表` | `06_实施总结.md` §1/§2：流程图节点数、时序图参与者数等，与总结可对照 |
| `mcpBreakdown` | 无 | `🧩 MCP 明细` | Playwright-MCP 工具次数，如 `nav 12 / snap 24 / click 8 / eval 9` |
| `backlog` | 无 | `🧾 待办与风险` | P1/P2 条数或摘要，如 `P1 2 项 / P2 5 项（见 §9）` |
| `statusRewrite` | 无 | `🗂️ 状态回写` | `01/02/03/04/05/07` 更新情况，如 `01-07 已更新，05 已最终回写` |

### 元信息字段

| 参数 | 默认值 | 写入字段 | 说明 |
|------|--------|---------|------|
| `model` | `AGENT_MODEL` / `CURSOR_AGENT_MODEL` / `Claude Sonnet 4.6` | `🤖 模型` | 本次执行使用的模型名称 |
| `tools` | `AGENT_TOOLS` / `Cursor Agent / Playwright-MCP / Shell / wework-bot` | `🧰 工具` | 本次执行涉及的主要工具 |
| `updatedAt` | 本地当前时间 | `🕒 最后更新` | `YYYY-MM-DD HH:mm:ss`，精确到秒 |
| `tokenUsage` | `AGENT_SESSION_TOKEN_USAGE` / `--token-usage`（未传时脚本可写入缺省说明） | `🪙 会话用量` | **必含**：本次会话 **Token 或用量摘要**（以 Cursor 用量面板为准）；未传时脚本注入「未在本地记录，请从 Cursor 用量面板核对」——有真实值时应改为 `--token-usage` 或环境变量，**禁止**编造 |
| `improvementHints` | `AGENT_SESSION_IMPROVEMENT_HINTS` / `--improvement-hints` | `💡 改进建议` | 基于**本次已发生事实**的 2～4 条可执行建议，**禁止**臆造指标或原因 |
| `noAutoGit` | `WEWORK_BOT_NO_AUTO_GIT=1` | — | 关闭 git 分支 / commit 自动检测（沙箱安全） |

## 工作流程

1. **组装消息**：按电梯法则组织内容：先给一句话结论，再给 100 字以内描述、流程、功能、阶段、状态、影响、证据和下一步；每条信息独占一行，并使用匹配状态的表情符号。
2. **补齐业务度量与会话成本**：完成通知、阻断通知、门禁异常通知**必须**出现 `⏱️ 用时`（本次会话耗时）与 `🪙 会话用量`（本次会话 Token/用量，与 Cursor 可核对）。须尽量再补齐 `🤝 AI 调用`、`🔗 调用链`、`📐 实施总结图表`、`🧩 MCP 明细`、`🧾 待办与风险`、`🗂️ 状态回写`、`📁 测试路径`、`🧫 测试统计`、`🔁 修复轮次`、`📦 产物`、`☁️ 文档同步`、`🌿 分支`、`🔖 提交` 等；其中前四项与 `06_实施总结.md` 的「AI 调用记录」及 §1/§2 Mermaid 图一致。脚本会自动检测 git 分支和 commit，并在未手写/未传 `--duration` / `--token-usage` 时**仍注入**上述两行（缺省为可核对说明，避免空项）。其余字段由调用方传入（可在命令行使用 `--diagram-summary`、`--mcp-breakdown`、`--backlog`、`--status-rewrite`）。
3. **补齐元信息**：每条消息必须包含 `🤖 模型`、`🧰 工具`、`🕒 最后更新` 三行；脚本会在缺失时自动补齐。长流程类推送在元信息前还应已有 `⏱️ 用时` 与 `🪙 会话用量`（见上条）。
4. **选择机器人**：优先使用显式 `webhookUrl` / `webhookKey`；其次使用环境变量；否则按 `robot` 或 `agent` 从配置中解析；未指定时走配置中的 `default_robot`。
5. **校验凭据**：`X-Token` 和 webhook 必须来自参数或环境变量，不得写入仓库。
6. **发送消息**：调用 `scripts/send-message.js`。
7. **汇总结果**：记录 HTTP 状态码、响应摘要、机器人路由、消息时间和脱敏凭据摘要；失败时返回错误原因。若该消息用于门禁失败、门禁失效或流程阻断，发送失败也必须写入实施总结或兜底运行记录。

## 推送文案与反幻觉（推荐代理）

- 需要**先 Plan 再写稿**、并系统核对「模型 / 工具 / 用时 / Token / 改进建议」时，可调用 `.claude/agents/message-pusher.md`（`message-pusher` 代理），再执行 `send-message.js`。
- **正文转义**：若从某处复制的内容里出现**字面** `\n` 而非真换行，可改用 `--content-file` 保存 UTF-8 多行文件，或依赖脚本在加载后对 `\\n` / `\\t` 做归一化（见 `send-message.js` 中 `normalizeMessageText`），避免企业微信中显示一坨反斜杠。

## 运行示例

使用完整 webhook：

```bash
API_X_TOKEN=*** node .claude/skills/wework-bot/scripts/send-message.js \
  --webhook-url "$WEWORK_WEBHOOK_URL" \
  --content "implement-code 阶段 6 冒烟测试通过" \
  --description "真实页面冒烟测试已通过，关键用户路径可继续进入收尾。" \
  --flow implement-code \
  --feature mermaid-toolbar \
  --stage "阶段 6：冒烟测试" \
  --status "通过" \
  --impact "关键用户路径已验证，可进入总结和同步" \
  --evidence "tests/e2e/mermaid-toolbar/*.spec.ts" \
  --next-step "进入阶段 7 生成实施总结"
```

使用 webhook key：

```bash
API_X_TOKEN=*** WEWORK_WEBHOOK_KEY=*** node .claude/skills/wework-bot/scripts/send-message.js \
  --content "generate-document 已生成全文档" \
  --description "全文档已保存，等待导入结果写入完成通知。"
```

按 agent 路由：

```bash
API_X_TOKEN=*** WEWORK_BOT_CONFIG=.claude/skills/wework-bot/config.local.json \
  node .claude/skills/wework-bot/scripts/send-message.js \
  --agent code-reviewer \
  --content "code-reviewer 发现 P0 问题，需要人工处理" \
  --description "代码审查发现阻断项，需要人工确认修复策略。"
```

演练不发送：

```bash
node .claude/skills/wework-bot/scripts/send-message.js \
  --token "***" \
  --webhook-key "***" \
  --content "预警测试" \
  --description "验证企业微信机器人路由和消息格式，不实际发送。" \
  --dry-run
```

## 生动总结格式规范（generate-document / implement-code 完成通知）

> `generate-document` 和 `implement-code` 每次执行结束，**必须**调用本技能发送一条生动总结，禁止省略或合并到其他消息中。
> 消息必须符合电梯法则：**10 秒内读懂结论、影响和下一步**。
>
> **执行顺序（严格遵守）：**
> 1. **先执行** `import-docs` 文档同步（`docs` 标准导入），获取实际的「创建 N、覆盖 N」数字
> 2. **再发送** wework-bot 通知，把上一步的实际数字填入 `☁️ 文档同步` 行
>
> 禁止在 `import-docs` 执行前发送通知，否则 `☁️ 文档同步` 行数字无法填写真实值。

### generate-document 完成（成功）

```
📄 文档生成完成
━━━━━━━━━━━━━━━━━
🎯 结论：文档已生成并完成同步
✅ 流程：generate-document
📌 功能：<功能名>
📝 描述：<100字以内描述>
📋 类型：<文档类型>（需求文档 / 设计文档 / 全文档…）
🔍 P0 自检：通过 <N> / 共 <N> 项
🌐 影响：<文档覆盖范围 / 可进入的下一流程>
📎 证据：<生成文件路径 / 自检摘要>
🤝 AI 调用：skills <N> / agents <N> / mcp <N> / tools <N>
🔗 调用链：<find-skills→find-agents→...→wework-bot>
📦 产物：<新生成 N 份 / 更新 M 份 / 类型分布>
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N，失败 N）
⏱️ 用时：<本次会话总耗时，如 12m 34s>
🪙 会话用量：<输入/输出/合计 Token 或用量摘要，与 Cursor 用量一致；见脚本缺省说明>
🌿 分支：<git-branch>
🔖 提交：<short-sha>
🤖 模型：<模型名>
🧰 工具：<主要工具清单>
🕒 最后更新：<YYYY-MM-DD HH:mm:ss>
👉 下一步：可进入评审或实施准备
```

### generate-document 完成（含 P0 失败）

```
⚠️ 文档生成完成（含 P0 失败项）
━━━━━━━━━━━━━━━━━
🎯 结论：文档已保存，但存在需处理的 P0 问题
📄 流程：generate-document
📌 功能：<功能名>
📝 描述：<100字以内描述>
📋 类型：<文档类型>
❌ P0 自检：失败 <N> 项
❌ 原因：<简短失败原因摘要，≤ 2 条>
🌐 影响：<受影响文档 / 无法进入的后续流程>
📎 证据：<失败检查项 / 生成文件路径 / 错误摘要>
🤝 AI 调用：skills <N> / agents <N> / mcp <N> / tools <N>
🔗 调用链：<find-skills→...→wework-bot>
📦 产物：<生成 N 份 / 失败 M 份>
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N，失败 N）
⏱️ 用时：<本次会话总耗时>
🪙 会话用量：<Token 或用量摘要；与 Cursor 一致>
🌿 分支：<git-branch>
🔖 提交：<short-sha>
🧭 恢复点：先修复 P0 失败项，再重新运行 `/generate-document <功能名>`
🤖 模型：<模型名>
🧰 工具：<主要工具清单>
🕒 最后更新：<YYYY-MM-DD HH:mm:ss>
👉 下一步：优先修复 P0 后再进入实施
```

### implement-code 完成（成功）

```
🚀 代码实施完成
━━━━━━━━━━━━━━━━━
🎯 结论：代码实施已完成，关键门禁全部通过
✅ 流程：implement-code
📌 功能：<功能名>
📝 描述：<100字以内描述>
📊 阶段：0 → 8（全部通过）
🧪 P0 检查项：全部通过（共 <N> 项）
🌐 影响：<已交付的用户价值 / 受影响模块 / 发布影响>
📎 证据：<测试命令 / 报告路径 / MCP 操作摘要>
🤝 AI 调用：skills <N> / agents <N> / mcp <N> / tools <N>
🔗 调用链：<find-skills→find-agents→test-page-builder→e2e-testing→playwright-mcp×N→code-review→impl-reporter→import-docs→wework-bot>
📁 测试路径：tests/ 内 <N> spec / <N> page / <N> fixture，无逸出
🧫 测试统计：spec <N> / case <N> / 通过 <N> / 失败 <N>
🔁 修复轮次：阶段2: <N> 轮 / 阶段6: <N> 轮
📈 指标：lint 0 / 影响链命中 <N>
📦 产物：代码 <N> 个，测试 <N> 个（均在 tests/），文档 <N> 个
📐 实施总结图表：§1 流程图 <N> 节点 / §2 时序图 <K> 参与者（与总结文件一致）
🧩 MCP 明细：nav <N> / snap <N> / click <N> / fill <N> / eval <N>（按实际）
🧾 待办与风险：P1 <N> 项 / P2 <N> 项（详见 06_实施总结 §9；无则写「无」）
🗂️ 状态回写：01/02/03/04/05/07 已更新（含 05 最终回写与 §5.5 复查）
📂 报告：docs/<功能名>/06_实施总结.md
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N，失败 N）
⏱️ 用时：<Hh Mm Ss>（本次会话起止或累计耗时）
🪙 会话用量：<Token 或用量摘要>
🟢 开始时间：<YYYY-MM-DD HH:mm:ss>（有则写）
🌿 分支：<git-branch>
🔖 提交：<short-sha>
🤖 模型：<模型名>
🧰 工具：<主要工具清单>
🕒 最后更新：<YYYY-MM-DD HH:mm:ss>
👉 下一步：可进入提交、评审或发布准备
```

### implement-code 阻断

```
⛔ 代码实施阻断
━━━━━━━━━━━━━━━━━
🎯 结论：代码实施已阻断，需要人工处理
🛠️ 流程：implement-code
📌 功能：<功能名>
📝 描述：<100字以内描述>
🔍 阻断阶段：阶段 <N>（<阶段名>）
❌ 原因：<简短阻断原因，≤ 2 条>
🧪 P0 状态：已通过 <N> / 共 <N> 项
🌐 影响：<当前无法交付的范围 / 已完成但不可发布的范围>
📎 证据：<失败命令 / 报告路径 / MCP 调用序列 / 错误摘要>
🤝 AI 调用：skills <N> / agents <N> / mcp <N> / tools <N>（已执行）
🔗 调用链：<已执行的调用链，标注阻断节点>
📁 测试路径：tests/ 内 <N> spec / <N> page，无逸出（或：发现 <N> 个逸出文件已迁移）
🔁 修复轮次：阶段<N>: <已尝试 N> 轮（已达上限）
📦 产物：代码 <N> 个，测试 <N> 个（均在 tests/，已落地但未过当前门禁）
📐 实施总结图表：§1 / §2 已写入（节点/参与者数 <N>/<K>）
🧩 MCP 明细：截至阻断前的 MCP 调用摘要
🧾 待办与风险：阻断项 + P1/P2（见 §9）
🗂️ 状态回写：01/02/03/04/05/07 已标记阻断或跳过原因
📂 报告：docs/<功能名>/06_实施总结.md
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N，失败 N）
⏱️ 用时：<Hh Mm Ss>（本次会话已耗费时间）
🪙 会话用量：<Token 或用量摘要>
🟢 开始时间：<YYYY-MM-DD HH:mm:ss>（有则写）
🌿 分支：<git-branch>
🔖 提交：<short-sha>
🧭 恢复点：从阶段 <N> 重新开始，先处理 <具体动作>
🤖 模型：<模型名>
🧰 工具：<主要工具清单>
🕒 最后更新：<YYYY-MM-DD HH:mm:ss>
👉 下一步：按阻断原因补齐输入或修复门禁
```

**格式强制要求：**

- 每条信息独占一行，使用 `━━━` 分隔线分隔标题与正文
- 表情符号与状态匹配：✅ 成功 / ⚠️ 警告 / ❌ 失败 / ⛔ 阻断 / 🔍 分析 / 📊 数据
- 必须包含 `🎯 结论：...` 行，放在标题分隔线后第一行；结论必须是一句话，优先说明结果和影响
- 必须包含 `📝 描述：...` 行，描述内容必须为 100 字以内，说明本次推送的背景、结果或下一步
- 完成通知与阻断通知必须**尽量补齐**业务度量字段（按上面模板顺序）：`🤝 AI 调用`、`🔗 调用链`、`📐 实施总结图表`、`🧩 MCP 明细`、`🧾 待办与风险`、`🗂️ 状态回写`、`📁 测试路径`、`🧫 测试统计`、`🔁 修复轮次`、`📦 产物`、`📂 报告`、`☁️ 文档同步`、`⏱️ 用时`、`🪙 会话用量`、`🌿 分支`、`🔖 提交`；**`⏱️ 用时` 与 `🪙 会话用量` 为必含**（`send-message.js` 可注入缺省说明）。脚本会自动补齐 `🌿 分支` / `🔖 提交` / `🤖 模型` / `🧰 工具` / `🕒 最后更新`。实现完成通知时，若已生成 `06_实施总结.md`，`📐/🧩/🧾/🗂️` 四行在可统计时**不得省略**。
- 完成通知必须包含 `📦 产物：...` 或等价产物统计；阻断通知必须包含 `🧭 恢复点：...` 与 `🔁 修复轮次：...`
- 必须包含 `🤖 模型：...`、`🧰 工具：...`、`🕒 最后更新：YYYY-MM-DD HH:mm:ss` 三行；时间必须精确到秒；同条消息须含 `⏱️ 用时` 与 `🪙 会话用量`（见上）
- 必须包含 `👉 下一步：...` 行，说明接收者下一步应做什么；无需行动时写「无需人工介入」
- 消息总长度建议不超过 2000 字；门禁失败、门禁失效、流程阻断消息优先完整说明，不得为了压缩而删除原因、证据、调用链、MCP/图表摘要、待办、产物、模型、工具或时间
- 数字必须来自实际执行结果，**不得**直接发送含 `<占位符>` 的模板
- `☁️ 文档同步` 行：若 `docs` 不存在，改为 `☁️ 文档同步：docs 不存在，跳过导入`
- `📁 测试路径` 行：必须基于 `artifact-contracts.md §2.2 测试路径门禁扫描命令` 的真实结果填写

## 消息建议（阶段通知）

阶段通知消息（非完成总结）应包含：

- 流程名称：`generate-document` / `implement-code`
- 功能名或文档路径
- 一句话结论：用 `🎯 结论：...` 放在正文第一行
- 描述内容：100 字以内，说明当前消息为什么推送
- 当前阶段
- 状态：开始 / 通过 / 阻断 / 失败 / 需要人工介入
- 使用模型、主要工具、最后更新时间（精确到秒），以及**本次会话** `⏱️ 用时` 与 `🪙 会话用量`（可传参或由脚本补缺省说明）
- 关键原因或下一步动作：用 `👉 下一步：...` 独占一行

## 门禁失败 / 失效强制通知

以下任一情况都必须发送 wework-bot 消息，且消息必须足够具体，能让接收者直接判断影响范围和恢复动作：

- 门禁检查执行失败：P0 未通过、命令失败、MCP 操作失败、脚本退出码非 0
- 门禁失效：应执行的门禁未执行、被跳过、缺少验证证据、只口头声明通过、降级未记录
- 阻断收尾失败：`06_实施总结.md` 未能写入、状态回写失败、`import-docs` 失败、通知发送失败

门禁类消息必须补充：

- `🔍 门禁：阶段 <N>（<门禁名称>）`
- `📎 证据：<报告路径 / 命令 / MCP 工具序列 / 失败摘要>`
- `📊 结果：通过 <N> / 失败 <M> / 未执行 <K>`
- `🤝 AI 调用：skills <N> / agents <N> / mcp <N>（已执行）`
- `🔗 调用链：<已执行的关键 skill / agent / MCP 链路>`
- `🔁 修复轮次：阶段<N>: <已尝试 N> 轮`
- `📁 测试路径：tests/ 内 <N> spec / <N> page，无逸出 / 发现 <N> 个逸出`
- `🌐 影响：<阻断范围、不可发布范围或需要人工确认的范围>`
- `🧭 恢复点：<从哪个阶段恢复、先做哪一步>`
- `🌿 分支：<git-branch>` `🔖 提交：<short-sha>`（脚本自动补齐）
- `🤖 模型：<模型名>`
- `🧰 工具：<主要工具清单>`
- `⏱️ 用时：<...>` 与 `🪙 会话用量：<...>`（与完成/阻断类要求一致）
- `🕒 最后更新：<YYYY-MM-DD HH:mm:ss>`

## 多机器人路由

本项目已配置好 `config.local.json`（已加入 `.gitignore`，不会提交），并把默认机器人 `general` 配置为用户指定的默认 `webhook_url`。脚本会优先读取 `WEWORK_BOT_CONFIG`；若未设置且本地配置文件存在，会自动加载 `.claude/skills/wework-bot/config.local.json`。

**必须预设的环境变量（只需设置一次）：**

```bash
export API_X_TOKEN=12345678
```

`WEWORK_BOT_CONFIG` 可选；只有需要切换到其他配置文件时才设置。建议把 `API_X_TOKEN` 写入 shell 配置文件（`~/.zshrc` 或 `~/.bashrc`）使其永久生效。

若需在新机器上使用，参考 `config.example.json` 重新填写真实密钥后另存为 `config.local.json`：

```bash
cp .claude/skills/wework-bot/config.example.json .claude/skills/wework-bot/config.local.json
# 编辑 config.local.json，把 webhook_key_env 改为 webhook_url / webhook_key 并填入本地真实值
```

配置优先级：

1. 命令行 `--webhook-url` / `--webhook-key`
2. 环境变量 `WEWORK_WEBHOOK_URL` / `WEWORK_WEBHOOK_KEY`
3. 命令行 `--robot`
4. 命令行 `--agent` 映射到配置中的机器人
5. 配置中的 `default_robot`

## 安全约束

- 不得提交真实 `X-Token`、webhook URL 或 webhook key。
- 不得提交 `config.local.json` 这类包含真实机器人密钥的配置文件。
- 回复用户时只展示脱敏摘要，不展示完整密钥。
- `generate-document` 和 `implement-code` 流程结束时的完成通知属于**强制执行**，不受"默认不自动发送"约束；其余场景默认不自动发送，除非用户明确要求或调用方 skill 的流程规则要求通知。

## 支持文件

- `README.md`：快速使用说明
- `rules/message-contract.md`：消息格式、安全和调用契约
- `config.example.json`：多机器人与 agent 路由示例
- `scripts/send-message.js`：实际发送脚本
