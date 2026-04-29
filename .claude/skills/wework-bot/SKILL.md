---
name: wework-bot
description: 发送企业微信机器人消息，用于 generate-document、implement-code 或其他长流程的监控预警、阶段通知和动态观测。用户提到企业微信机器人、wework、webhook、预警、监控通知或 send-message 时使用。
---

# wework-bot

## 定位

`wework-bot` 是企业微信机器人通知技能。它负责把阶段状态、阻断原因、验证结果或人工介入请求发送到企业微信群机器人，并支持按 agent 路由到不同机器人。

## 何时使用

- `generate-document` 生成文档开始、完成、阻断或自检失败时需要通知
- `implement-code` 阶段门禁、代码实施、冒烟测试、阻断总结需要动态观测
- 用户明确要求发送企业微信机器人消息
- 需要把长流程状态推送到外部群聊

## 输入

### `send-message.js` CLI（脚本只做路由与 HTTP 发送）

| 环境变量 / 参数 | 说明 |
|----------------|------|
| `API_X_TOKEN` | 必填，网关 `X-Token` |
| `WEWORK_BOT_API_URL` | 可选，覆盖默认 API |
| `WEWORK_BOT_CONFIG` | 可选，路由 JSON 路径（默认仓库内 `skills/wework-bot/config.json`） |
| `--agent` | 按 `config.agents` 映射到 robot（推荐） |
| `--robot` | 直接指定 robot 名（少用） |
| `--content` / `-c` | 完整正文字符串 |
| `--content-file` / `-f` | 从 UTF-8 文件读取完整正文（推荐长文案） |

webhook 仅在 `config.json`（或 robot 级 `webhook_*_env`）中配置，**无** CLI 传入。

### 正文里的内容字段（由 agent 写入，不由脚本拼装）

结论、描述、范围、门禁、度量、`⏱️ 会话`（合并耗时与用量）、明细段的模型 / 工具 / 分支等均在 **message-pusher**（或其它 agent）生成的正文中体现；分层规则见 `rules/message-contract.md`。

## 工作流程

1. **组装消息**：由 message-pusher（或等价流程）按电梯法则与仓库契约写好**完整正文**（可先 Plan 再写稿）。
2. **会话与时间等事实**：优先在摘要段写 **`⏱️ 会话：`** 一行合并耗时与用量（可从会话记录、账单与 `.claude/session-time.json` 核对）；审计若需要再起止时刻，放入明细段，不要求四人并排堆砌。
3. **选择机器人**：`config.json` 按 `--agent` 或 `--robot` 解析 webhook；未指定时使用 `default_robot`。
4. **校验凭据**：`API_X_TOKEN`；webhook 来自配置。
5. **发送**：`node scripts/send-message.js --agent … --content-file …`（或 `--content`）；脚本对正文仅做 `\\n`/`\\t` 字面量归一化，**不**注入模板行。
6. **汇总结果**：根据 HTTP 状态码与响应体判断是否成功；失败时排查 token、webhook 与网关返回。

## 推送文案与反幻觉（推荐代理）

- 需要**先 Plan 再写稿**、并系统核对「模型 / 工具 / 用时 / Token / 改进建议」时，可调用 `.claude/agents/message-pusher.md`（`message-pusher` 代理），再执行 `send-message.js`。
- **正文转义**：若从某处复制的内容里出现**字面** `\n` 而非真换行，可改用 `--content-file` 保存 UTF-8 多行文件，或依赖脚本在加载后对 `\\n` / `\\t` 做归一化（见 `send-message.js` 中 `normalizeMessageText`），避免企业微信中显示一坨反斜杠。

## 运行示例

（正文已由 message-pusher 写好；若较短可用 `--content`，长文用 `-f` 文件。）

```bash
API_X_TOKEN=*** node .claude/skills/wework-bot/scripts/send-message.js \
  --agent implement-code \
  --content $'📣 消息推送\n━━━━━━━━━━━━━━━━━\n🎯 结论：阶段 6 冒烟通过\n📝 描述：关键路径已验证，可进入收尾。'
```

```bash
API_X_TOKEN=*** node .claude/skills/wework-bot/scripts/send-message.js \
  --agent generate-document \
  -f ./tmp/wework-body.md
```

## 推送正文来源（不提供固定模板）

本技能不在 `SKILL.md` 内提供固定模板。推送正文由 `.claude/agents/message-pusher.md`（`message-pusher`）基于事实整理成**完整字符串**，再交给 `scripts/send-message.js` 做 **路由与 POST**（不对正文做字段补齐或校验）。

**格式与管理层阅读体验（唯一真源）**：全文契约见 `rules/message-contract.md`。核心约定：**摘要段（分隔线之上）给管理者**，约 10 秒内可读清结论、影响、下一步；**明细段（「核对明细」分隔线之下）给研发核对**。用 `📌 范围：` 合并项目与功能；用 `⏱️ 会话：` 一行合并耗时与用量；勿在摘要堆砌调用链 / MCP 明细 / 模型工具——上述放入明细段。完成类长流程须在明细段按真源补齐图表 / MCP / 测试路径等，无数据则省略该行。

**摘要段硬性必含**：`🎯 结论`、`📝 描述`、`📌 范围`、`👉 下一步`；完成 / 阻断 / 门禁还须含 `🌐 影响`、`📎 证据`（摘要单行）、`⏱️ 会话`。明细段须含（有来源时）`🤖` `🧰` `🕒` 及审计字段，规则见契约。

## 消息建议（阶段通知）

阶段通知（非完成总结）可 **仅写摘要段**（约 ≤10 行）：流程名、`📌 范围`、`🎯 结论`、`📝 描述`、当前阶段与状态、必要时一行 `⏱️ 会话`、`👉 下一步`。模型 / 工具 / 精确时间放入明细段 **仅在与本次推送强相关时**。

## 门禁失败 / 失效强制通知

以下任一情况都必须发送 wework-bot 消息，且 **摘要段** 须能让人判断影响与恢复动作（详见 `rules/message-contract.md` 门禁模板）：

- 门禁检查执行失败：P0 未通过、命令失败、MCP 操作失败、脚本退出码非 0
- 门禁失效：应执行的门禁未执行、被跳过、缺少验证证据、只口头声明通过、降级未记录
- 阻断收尾失败：`06_实施总结.md` 未能写入、状态回写失败、`import-docs` 失败、通知发送失败

## 会话中断强制通知（与仓库规则一致）

除上述门禁类场景外，**任何会话出现非正常结束（中断/阻断/流程异常停止）都必须发送 wework-bot 消息**，参见仓库级规则 `CLAUDE.md §5 会话中断 / 阻断通知（强制）`。

要求：

- **会话成本**：优先在摘要用 **`⏱️ 会话：`** 一行写出耗时与用量（或「未记录，请核对账单」）；必要时在明细补起止时间。**禁止**整段省略会话交代且无说明。
- 必须说明：发生在哪个流程/阶段、为何中断、影响范围、证据与恢复点

门禁类消息：**摘要段** 必须可见结论、门禁名、原因、影响、恢复点、下一步；完整命令路径 / MCP 序列等可置于 **明细段**「证据（完整）」行。

## 多机器人路由

脚本会优先读取 `WEWORK_BOT_CONFIG`；若未设置，会读取仓库内默认 `config.json`。配置文件保存机器人/agent **路由关系**，并在各 robot 下填写 `webhook_url` 或 `webhook_key`。

**必须预设的环境变量（只需设置一次）：**

```bash
export API_X_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`WEWORK_BOT_CONFIG` 可选；只有需要切换到其他配置文件时才设置。建议把 `API_X_TOKEN` 写入 shell 配置文件（`~/.zshrc` 或 `~/.bashrc`）使其永久生效。

配置优先级：

1. 选定 robot（命令行 `--robot`，否则 `--agent` 映射，否则 `default_robot`）
2. `config.json` 中该 robot 的 `webhook_url` 或 `webhook_key`（顶层同名字段可作兜底）

## 安全约束

- 不得提交真实 `X-Token`、webhook URL 或 webhook key。
- 默认 `config.json` 使用明文 **`webhook_url`**（完整 URL）与单一 `general` 路由；多群分流时可增加 robot 条目。
- 回复用户时只展示脱敏摘要，不展示完整密钥。
- `generate-document` 和 `implement-code` 流程结束时的完成通知属于**强制执行**，不受"默认不自动发送"约束；其余场景默认不自动发送，除非用户明确要求或调用方 skill 的流程规则要求通知。

## 支持文件

- `README.md`：快速使用说明
- `rules/message-contract.md`：消息格式、安全和调用契约
- `config.json`：默认配置（已提交）
- `scripts/send-message.js`：实际发送脚本
