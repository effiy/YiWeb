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
  --flow implement-code \
  --feature mermaid-toolbar \
  --stage "阶段 6：冒烟测试" \
  --status "通过" \
  --impact "关键用户路径已验证，可进入总结和同步" \
  --evidence "tests/e2e/mermaid-toolbar/*.spec.ts" \
  --next-step "进入阶段 7 生成实施总结"
```

单行 `--content` 会自动包装成电梯法则格式：

```text
📣 消息推送
━━━━━━━━━━━━━━━━━
🎯 结论：implement-code 阶段 6 冒烟测试通过
📝 描述：真实页面冒烟测试已通过，关键用户路径可继续进入收尾。
🛠️ 流程：implement-code
📌 功能：mermaid-toolbar
📍 阶段：阶段 6：冒烟测试
📊 状态：通过
🌐 影响：关键用户路径已验证，可进入总结和同步
📎 证据：tests/e2e/mermaid-toolbar/*.spec.ts
👉 下一步：进入阶段 7 生成实施总结
🤖 模型：GPT-5.5
🧰 工具：Cursor Agent / wework-bot
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
- `--model`：模型名称，默认读取 `AGENT_MODEL` / `CURSOR_AGENT_MODEL`，兜底为 `GPT-5.5`
- `--tools`：主要工具清单，默认读取 `AGENT_TOOLS`，兜底为 `Cursor Agent / wework-bot`
- `--updated-at`：最后更新时间，格式 `YYYY-MM-DD HH:mm:ss`；未传入时自动使用本地当前时间，精确到秒
- `--dry-run`：只打印脱敏摘要，不发送

## 消息格式

推送内容遵循电梯法则：10 秒内说清楚“结论、背景、关键事实、下一步”。推荐分行格式：

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
🌐 影响：<影响范围>
📎 证据：<报告路径 / 命令 / MCP 序列 / 结果摘要>
🤖 模型：<模型名>
🧰 工具：<主要工具清单>
🕒 最后更新：<YYYY-MM-DD HH:mm:ss>
👉 下一步：<需要执行的动作；无需行动时写“无需人工介入”>
```

门禁失败、门禁失效、证据缺失或流程阻断时必须发送通知，并在正文中写清门禁阶段、失败证据、通过/失败/未执行数量、影响范围、恢复点、模型、工具和最后更新时间。发送脚本会自动补齐缺失的模型、工具和秒级时间行，也可通过 `--flow`、`--feature`、`--stage`、`--status`、`--impact`、`--evidence`、`--next-step` 自动补齐上下文行。

## 配置说明

复制示例配置后填入本地环境变量；若使用本仓库已有 `config.local.json`，通常只需要设置 `API_X_TOKEN`：

```bash
cp .claude/skills/wework-bot/config.example.json .claude/skills/wework-bot/config.local.json
export WEWORK_WEBHOOK_KEY_SECURITY=***
```

不要提交包含真实 webhook key 的本地配置。
