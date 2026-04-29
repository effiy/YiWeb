# wework-bot 快速索引

`wework-bot` 用于发送企业微信机器人通知，主要服务 `generate-document` 与 `implement-code` 的监控预警、阶段通知和动态观测。
支持配置多个机器人，并按 agent 名称自动路由。

## 快速开始

本项目已配置好 `config.json`（默认路由配置，已提交）：单一 `general` 机器人，填写完整 **`webhook_url`**（与发给 API 的 JSON 字段同名），各 agent 均路由到该机器人。亦可使用 `webhook_key`（脚本会拼成同上 URL）。

`API_X_TOKEN` 仍只走系统环境变量（不从配置文件读取）。脚本请求 API 时使用浏览器风格请求头（含 `User-Agent`），以适配网关校验。

```bash
export API_X_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

正文由 agent（推荐先经 `message-pusher`）写成完整文案，再交给 `send-message.js` **只做路由与 HTTP 发送**，不在脚本内拼装电梯块或注入字段。

发送消息（短正文可直接 `--content`）：

```bash
API_X_TOKEN=*** node .claude/skills/wework-bot/scripts/send-message.js \
  --agent implement-code \
  --content $'📣 阶段通知\n🎯 结论：冒烟通过\n📝 描述：关键路径已验证。'
```

长正文推荐写入 UTF-8 文件后使用 `--content-file`：

```bash
API_X_TOKEN=*** node .claude/skills/wework-bot/scripts/send-message.js \
  --agent security-reviewer \
  -f ./notify-body.md
```

## 文件职责

| 文件                        | 职责                         |
| --------------------------- | ---------------------------- |
| `SKILL.md`                  | 何时使用、输入参数、工作流程 |
| `rules/message-contract.md` | 消息格式、安全和调用契约     |
| `config.example.json`       | 多机器人与 agent 路由示例    |
| `scripts/send-message.js`   | CLI 实现                     |
| `tests/send-message.test.mjs` | `send-message.js` 回归测试（`node:test`，零依赖） |

## 测试

若存在 `tests/send-message.test.mjs`，可在 skill 根目录执行（通常为 mock HTTP，避免误发真实群）：

```bash
cd .claude/skills/wework-bot && node --test tests/send-message.test.mjs
```

## 常用参数

- `--agent`：按配置映射选择机器人（推荐）；`--robot` 直接指定 robot 名（少用）
- `--config`：路由 JSON（默认 `WEWORK_BOT_CONFIG`，否则仓库内 `config.json`）
- `--content` / `-c`、`--content-file` / `-f`：**完整正文**（二选一）
- `--api-url` / `-a`：覆盖发送 API

完整列表见 `node .../send-message.js --help`。

## 消息要求（不提供固定模板）

必含字段与 **摘要 / 明细（管理层优先）** 分层规则由 **`message-pusher`** 在正文中落实；详见 `SKILL.md` 与 `rules/message-contract.md`。`send-message.js` **不对正文做自动补齐或校验**（仅做 `\n`/`\t` 字面量归一化）。

## 配置说明

配置文件用于 **路由关系 + webhook**：机器人优先写 **`webhook_url`**（完整 URL）；仅 key 时可写 **`webhook_key`**。

不要把真实 webhook / token 提交到公开仓库。
