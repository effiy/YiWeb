# wework-bot 快速索引

`wework-bot` 用于发送企业微信机器人通知，主要服务 `generate-document` 与 `implement-code` 的监控预警、阶段通知和动态观测。
支持配置多个机器人，并按 agent 名称自动路由。

## 快速开始

本项目已配置好未提交的 `config.local.json`，默认机器人 `general` 已使用本地默认 webhook。只需预设 API token 即可直接使用：

```bash
export API_X_TOKEN=12345678
```

发送消息（自动加载 `config.local.json` 中的默认机器人）：

```bash
node .claude/skills/wework-bot/scripts/send-message.js \
  --content "implement-code 阶段 6 冒烟测试通过" \
  --description "真实页面冒烟测试已通过，关键用户路径可继续进入收尾。" \
  --conclusion "阶段 6 全部 P0 通过，可继续进入收尾" \
  --flow implement-code \
  --feature mermaid-toolbar \
  --stage "阶段 6：冒烟测试" \
  --status "通过" \
  --gate-name "G6 冒烟测试" --gate-result "通过 5 / 失败 0 / 未执行 0" \
  --ai-calls "skills 5 / agents 4 / mcp 1 / tools 9" \
  --call-chain "find-skills→find-agents→test-page-builder→e2e-testing→playwright-mcp×4→code-review→impl-reporter→import-docs→wework-bot" \
  --test-paths "tests/e2e/mermaid-toolbar 6 spec / 3 page，无逸出" \
  --test-stats "spec 6 / case 24 / 通过 24 / 失败 0" \
  --retries "阶段2: 1 轮 / 阶段6: 0 轮" \
  --artifacts "代码 4 / 测试 6 / 文档 1" \
  --metrics "lint 0 / 影响链命中 4" \
  --duration "1h 23m 45s" --started-at "2026-04-25 13:08:15" \
  --token-usage "输入 95k / 输出 8.2k / 合计 103.2k（来源：Cursor 用量）" \
  --report-path "docs/mermaid-toolbar/06_实施总结.md" \
  --diagram-summary "§1 流程图 32 节点 / §2 时序图 11 参与者" \
  --mcp-breakdown "nav 4 / snap 12 / click 6 / eval 8" \
  --backlog "P1 0 项 / P2 2 项（见 §9）" \
  --status-rewrite "01-07 已更新" \
  --impact "关键用户路径已验证，可进入总结和同步" \
  --evidence "tests/e2e/mermaid-toolbar/*.spec.ts" \
  --next-step "进入阶段 7 生成实施总结"
```

单行 `--content` 会自动包装成电梯法则格式：

```text
📣 消息推送
━━━━━━━━━━━━━━━━━
🎯 结论：阶段 6 全部 P0 通过，可继续进入收尾
📝 描述：真实页面冒烟测试已通过，关键用户路径可继续进入收尾。
🛠️ 流程：implement-code
📌 功能：mermaid-toolbar
📍 阶段：阶段 6：冒烟测试
📊 状态：通过
🔍 门禁：G6 冒烟测试
📊 结果：通过 5 / 失败 0 / 未执行 0
🤝 AI 调用：skills 5 / agents 4 / mcp 1 / tools 9
🔗 调用链：find-skills→find-agents→test-page-builder→e2e-testing→playwright-mcp×4→code-review→impl-reporter→import-docs→wework-bot
📁 测试路径：tests/e2e/mermaid-toolbar 6 spec / 3 page，无逸出
🧫 测试统计：spec 6 / case 24 / 通过 24 / 失败 0
🔁 修复轮次：阶段2: 1 轮 / 阶段6: 0 轮
📦 产物：代码 4 / 测试 6 / 文档 1
📈 指标：lint 0 / 影响链命中 4
📂 报告：docs/mermaid-toolbar/06_实施总结.md
🌐 影响：关键用户路径已验证，可进入总结和同步
📎 证据：tests/e2e/mermaid-toolbar/*.spec.ts
⏱️ 用时：1h 23m 45s
🪙 会话用量：输入 95k / 输出 8.2k / 合计 103.2k（来源：Cursor 用量）
🟢 开始时间：2026-04-25 13:08:15
🌿 分支：feature/mermaid-toolbar
🔖 提交：a1b2c3d
👉 下一步：进入阶段 7 生成实施总结
🤖 模型：Claude Sonnet 4.6
🧰 工具：Cursor Agent / Playwright-MCP / Shell / wework-bot
🕒 最后更新：2026-04-25 14:32:00
```

按 agent 自动路由机器人：

```bash
node .claude/skills/wework-bot/scripts/send-message.js \
  --agent security-reviewer \
  --content "security-reviewer 发现安全风险" \
  --description "安全审查发现风险项，需要确认是否阻断发布。"
```

演练不发送（验证参数）：

```bash
node .claude/skills/wework-bot/scripts/send-message.js \
  --content "测试消息" \
  --description "验证企业微信机器人路由和格式，不实际发送。" \
  --dry-run
```

## 文件职责

| 文件 | 职责 |
|------|------|
| `SKILL.md` | 何时使用、输入参数、工作流程 |
| `rules/message-contract.md` | 消息格式、安全和调用契约 |
| `config.example.json` | 多机器人与 agent 路由示例 |
| `scripts/send-message.js` | CLI 实现 |

## 常用参数

- `--token, -t`：API X-Token，默认读取 `API_X_TOKEN`
- `--api-url, -a`：发送 API，默认 `https://api.effiy.cn/wework/send-message`
- `--config`：机器人路由配置，默认读取 `WEWORK_BOT_CONFIG`；未设置且 `config.local.json` 存在时自动加载
- `--agent`：agent 名称，从配置中解析机器人
- `--robot, -r`：机器人名称，优先级高于 `--agent`
- `--webhook-url, -w`：完整企业微信机器人 webhook
- `--webhook-key, -k`：企业微信机器人 key，自动拼接标准 webhook
- `--content, -c`：消息正文
- `--description, -d`：消息描述，必填，100 字以内；也可写在正文的 `📝 描述：...` 行
- `--content-file, -f`：从文件读取消息正文
- `--flow`：流程名，如 `implement-code` / `generate-document`
- `--feature`：功能名或文档路径
- `--stage`：当前阶段
- `--status`：当前状态
- `--impact`：影响范围、交付范围或阻断影响
- `--evidence`：证据路径、命令、MCP 调用序列或结果摘要
- `--next-step`：接收者下一步动作；不传时使用默认恢复建议
- `--conclusion`：一句话结论，自动渲染为 `🎯 结论：...` 行
- `--gate-name` / `--gate-result`：门禁名称与结果（通过/失败/未执行计数）
- `--ai-calls`：AI 调用统计，格式建议 `skills N / agents N / mcp N / tools N`
- `--call-chain`：关键调用链，使用 `→` / `,` / `/` 分隔
- `--test-paths`：测试路径门禁扫描结果，必须基于 `tests/` 真实扫描
- `--test-stats`：测试结果统计，格式建议 `spec N / case N / 通过 N / 失败 N`
- `--retries`：阶段修复轮次摘要
- `--artifacts`：产物清单（代码 / 测试 / 文档）
- `--sync-result`：文档同步结果（创建 N，覆盖 N，失败 N），未传时脚本自动判断 `docs/` 是否存在
- `--metrics`：业务指标摘要（lint / 影响链 / 冒烟时间）
- `--p0-pass` / `--p0-total`：P0 自检通过数 / 总数
- `--doc-type`：文档类型（需求文档 / 设计文档 / 全文档…）
- `--duration` / `--started-at`：本次会话总耗时与开始时间；未传且正文无 `⏱️ 用时` 时，脚本会注入可核对缺省句
- `--token-usage` / `AGENT_SESSION_TOKEN_USAGE`：本次会话 Token/用量；未传且正文无 `🪙 会话用量` 时，脚本会注入可核对缺省句
- `--report-path`：实施总结或文档报告路径
- `--branch` / `--commit`：分支与短 SHA；未传时脚本自动从 git 检测，可通过 `--no-auto-git` 关闭
- `--reason`：阻断 / 失败原因，渲染为 `❌ 原因：...`
- `--recover`：恢复点，渲染为 `🧭 恢复点：...`
- `--no-auto-git`：禁用 git 自动检测分支与 commit
- `--model`：模型名称，默认读取 `AGENT_MODEL` / `CURSOR_AGENT_MODEL`，兜底为 `Claude Sonnet 4.6`
- `--tools`：主要工具清单，默认读取 `AGENT_TOOLS`，兜底为 `Cursor Agent / Playwright-MCP / Shell / wework-bot`
- `--updated-at`：最后更新时间，格式 `YYYY-MM-DD HH:mm:ss`；未传入时自动使用本地当前时间，精确到秒
- `--dry-run`：只打印脱敏摘要，不发送

## 消息格式

推送内容遵循电梯法则：10 秒内说清楚"结论、背景、关键事实、下一步"。推荐分行格式：

```text
📣 <流程名> <状态>
━━━━━━━━━━━━━━━━━
🎯 结论：<一句话说明结果和影响>
🛠️ 流程：<流程名>
📌 功能：<功能名或文档路径>
📝 描述：<100字以内描述>
📍 阶段：<阶段名>
📊 状态：<当前状态>
🔎 关键：<1-2 个关键事实或原因>
🤝 AI 调用：skills <N> / agents <N> / mcp <N> / tools <N>
🔗 调用链：<find-skills→...→wework-bot>
📁 测试路径：<tests/ 内 spec/page/fixture 数量与逸出情况>
🧫 测试统计：<spec/case/通过/失败>
🔁 修复轮次：<阶段2: N 轮 / 阶段6: N 轮>
📦 产物：<代码 / 测试 / 文档>
📈 指标：<lint / 影响链 / 冒烟时间>
🌐 影响：<影响范围>
📎 证据：<报告路径 / 命令 / MCP 序列 / 结果摘要>
📂 报告：<报告路径>
☁️ 文档同步：<docs → YiAi 摘要>
⏱️ 用时：<本次会话总耗时>
🪙 会话用量：<Token/用量 摘要，与 Cursor 可核对>
🟢 开始时间：<YYYY-MM-DD HH:mm:ss>
🌿 分支：<git-branch>
🔖 提交：<short-sha>
🤖 模型：<模型名>
🧰 工具：<主要工具清单>
🕒 最后更新：<YYYY-MM-DD HH:mm:ss>
👉 下一步：<需要执行的动作；无需行动时写"无需人工介入">
```

门禁失败、门禁失效、证据缺失或流程阻断时必须发送通知，并在正文中写清门禁阶段、失败证据、通过/失败/未执行数量、影响范围、恢复点、调用链、产物、**⏱️ 用时**、**🪙 会话用量**、模型、工具和最后更新时间。发送脚本会自动补齐缺失的模型、工具、秒级时间、git 分支与 commit，以及未写的 `⏱️ 用时` / `🪙 会话用量`（缺省为「请从 Cursor 核对」类说明）；也可通过 `--flow`、`--feature`、`--stage`、`--status`、`--impact`、`--evidence`、`--next-step`、`--conclusion`、`--ai-calls`、`--call-chain`、`--test-paths`、`--retries`、`--artifacts`、`--metrics`、`--duration`、`--token-usage`、`--report-path` 自动补齐上下文行。

## 配置说明

复制示例配置后填入本地环境变量；若使用本仓库已有 `config.local.json`，通常只需要设置 `API_X_TOKEN`：

```bash
cp .claude/skills/wework-bot/config.example.json .claude/skills/wework-bot/config.local.json
export WEWORK_WEBHOOK_KEY_SECURITY=***
```

不要提交包含真实 webhook key 的本地配置。
