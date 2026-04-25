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

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `token` | `API_X_TOKEN` | `https://api.effiy.cn` 的 `X-Token` |
| `apiUrl` | `https://api.effiy.cn/wework/send-message` | 发送消息 API |
| `config` | `WEWORK_BOT_CONFIG` 或 `.claude/skills/wework-bot/config.local.json`（存在时自动加载） | 多机器人路由配置 JSON |
| `agent` | 无 | agent 名称，用于从配置中选择机器人 |
| `robot` | 配置默认值 | 机器人名称，优先级高于 `agent` |
| `webhookUrl` | `WEWORK_WEBHOOK_URL` | 完整企业微信机器人 webhook |
| `webhookKey` | `WEWORK_WEBHOOK_KEY` | 企业微信机器人 key，可自动拼接 webhook |
| `content` | 无 | 消息正文 |
| `description` | 无 | 消息描述，必填，100 字以内；也可写在正文的 `📝 描述：...` 行 |
| `contentFile` | 无 | 从文件读取消息正文 |
| `flow` | 无 | 流程名，如 `implement-code` / `generate-document`，会写入 `🛠️ 流程` 行 |
| `feature` | 无 | 功能名或文档路径，会写入 `📌 功能` 行 |
| `stage` | 无 | 当前阶段，会写入 `📍 阶段` 行 |
| `status` | 无 | 当前状态，会写入 `📊 状态` 行 |
| `impact` | 无 | 用户可见影响、交付范围或阻断影响，会写入 `🌐 影响` 行 |
| `evidence` | 无 | 证据路径、命令、MCP 调用序列或结果摘要，会写入 `📎 证据` 行 |
| `nextStep` | 默认恢复建议 | 下一步动作，会写入 `👉 下一步` 行 |
| `model` | `AGENT_MODEL` / `CURSOR_AGENT_MODEL` / `GPT-5.5` | 本次执行使用的模型名称，会写入 `🤖 模型` 行 |
| `tools` | `AGENT_TOOLS` / `Cursor Agent / wework-bot` | 本次执行涉及的主要工具，会写入 `🧰 工具` 行 |
| `updatedAt` | 本地当前时间 | `YYYY-MM-DD HH:mm:ss`，精确到秒，会写入 `🕒 最后更新` 行 |

## 工作流程

1. **组装消息**：按电梯法则组织内容：先给一句话结论，再给 100 字以内描述、流程、功能、阶段、状态、影响、证据和下一步；每条信息独占一行，并使用匹配状态的表情符号；每条消息必须包含 `🤖 模型`、`🧰 工具`、`🕒 最后更新` 三行。
2. **选择机器人**：优先使用显式 `webhookUrl` / `webhookKey`；其次使用环境变量；否则按 `robot` 或 `agent` 从配置中解析；未指定时走配置中的 `default_robot`。
3. **校验凭据**：`X-Token` 和 webhook 必须来自参数或环境变量，不得写入仓库。
4. **发送消息**：调用 `scripts/send-message.js`。
5. **汇总结果**：记录 HTTP 状态码、响应摘要、机器人路由、消息时间和脱敏凭据摘要；失败时返回错误原因。若该消息用于门禁失败、门禁失效或流程阻断，发送失败也必须写入实施总结或兜底运行记录。

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
📎 证据：<生成文件路径 / 自检摘要 / import-docs 摘要>
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N）
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
📝 失败原因：<简短摘要，≤ 2 条>
🌐 影响：<受影响文档 / 无法进入的后续流程>
📎 证据：<失败检查项 / 生成文件路径 / 错误摘要>
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N）
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
📊 阶段：0 → 7（全部通过）
🧪 P0 检查项：全部通过（共 <N> 项）
🌐 影响：<已交付的用户价值 / 受影响模块 / 发布影响>
📎 证据：<测试命令 / 报告路径 / MCP 操作摘要>
📦 产物：代码 <N> 个，测试 <N> 个，文档 <N> 个
🗂️ 状态回写：01/02/03/04/05/07 已更新
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N）
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
📊 P0 状态：已通过 <N> / 共 <N> 项
🌐 影响：<当前无法交付的范围 / 已完成但不可发布的范围>
📎 证据：<失败命令 / 报告路径 / MCP 调用序列 / 错误摘要>
🧭 恢复点：从阶段 <N> 重新开始，先处理 <具体动作>
🗂️ 状态回写：01/02/03/04/05/07 已标记阻断或跳过原因
☁️ 文档同步：docs → YiAi（创建 N，覆盖 N）
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
- 建议包含 `🌐 影响：...` 和 `📎 证据：...` 行；门禁失败、门禁失效、阻断和完成通知必须包含
- 完成通知必须包含 `📦 产物：...` 或等价产物统计；阻断通知必须包含 `🧭 恢复点：...`
- 必须包含 `🤖 模型：...`、`🧰 工具：...`、`🕒 最后更新：YYYY-MM-DD HH:mm:ss` 三行；时间必须精确到秒
- 必须包含 `👉 下一步：...` 行，说明接收者下一步应做什么；无需行动时写“无需人工介入”
- 消息总长度建议不超过 800 字；门禁失败、门禁失效、流程阻断消息优先完整说明，不得为了压缩而删除原因、证据、模型、工具或时间
- 数字必须来自实际执行结果，**不得**直接发送含 `<占位符>` 的模板
- `☁️ 文档同步` 行：若 `docs` 不存在，改为 `☁️ 文档同步：docs 不存在，跳过导入`

## 消息建议（阶段通知）

阶段通知消息（非完成总结）应包含：

- 流程名称：`generate-document` / `implement-code`
- 功能名或文档路径
- 一句话结论：用 `🎯 结论：...` 放在正文第一行
- 描述内容：100 字以内，说明当前消息为什么推送
- 当前阶段
- 状态：开始 / 通过 / 阻断 / 失败 / 需要人工介入
- 使用模型、主要工具、最后更新时间（精确到秒）
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
- `🌐 影响：<阻断范围、不可发布范围或需要人工确认的范围>`
- `🧭 恢复点：<从哪个阶段恢复、先做哪一步>`
- `🤖 模型：<模型名>`
- `🧰 工具：<主要工具清单>`
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
