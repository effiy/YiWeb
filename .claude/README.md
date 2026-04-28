# `.claude` 目录说明

`.claude` 是 YiWeb 项目的 Claude / Cursor 协作层，承载命令入口、技能定义、专家代理和共享规范。

## 目录职责

| 目录 | 作用 | 是否为稳定入口 |
|------|------|---------------|
| `commands/` | Slash Command 包装层，只负责转调 skill | 是 |
| `skills/` | 可被直接调用的技能定义，`SKILL.md` 是技能真源 | 是 |
| `agents/` | 专家代理定义，负责角色、输入输出和必答问题 | 是 |
| `shared/` | 共享解释性文档，统一约定、路径和边界说明 | 否 |

## 真源规则

1. `commands/*.md` 只保留一句话入口说明，不承载业务规则。
2. `skills/<name>/SKILL.md` 是该 skill 的行为真源。
3. `skills/<name>/README.md` 仅用于快速开始、导航和索引，不重复完整规则。
4. `skills/<name>/rules/*.md` 定义结构契约。
5. `skills/<name>/templates/*.md` 只提供可选骨架，不得覆盖 `rules/`。
6. `skills/<name>/checklists/*.md` 定义验收项，`checklist.md` 仅作为入口索引。
7. `agents/*.md` 只描述代理角色，不复制 skill 的完整流程。

## 推荐阅读顺序

### 文档生成链路

1. `skills/generate-document/SKILL.md`
2. `skills/generate-document/README.md`
3. `shared/document-contracts.md`
4. `shared/evidence-and-uncertainty.md`（generate-document / implement-code 共享：反幻觉、可采纳性、`06` 中自我改进与可验证下一步）
5. `shared/impact-analysis-contract.md`
6. `shared/path-conventions.md`
7. `shared/agent-skill-boundaries.md`

完成阶段固定顺序：先调用 `skills/import-docs/SKILL.md` 同步 `docs`，再调用 `skills/wework-bot/SKILL.md` 发送带真实同步数字的完成通知。

### 文档导入链路

1. `skills/import-docs/SKILL.md`
2. `skills/import-docs/README.md`
3. `skills/import-docs/rules/import-contract.md`
4. `skills/import-docs/scripts/import-docs.js`

### 通知与观测链路

1. `skills/wework-bot/SKILL.md`
2. `skills/wework-bot/README.md`
3. `skills/wework-bot/rules/message-contract.md`
4. `skills/wework-bot/config.example.json`
5. `skills/wework-bot/scripts/send-message.js`
6. 长流程推送正文策划与反幻觉核对：`agents/message-pusher.md`（先 Plan 后写稿，再调 `send-message.js`）

本地默认机器人配置在未提交的 `skills/wework-bot/config.local.json` 中；脚本会在该文件存在时自动加载，作为 `generate-document`、`import-docs` 和长流程阻断通知的默认推送通道。

### 技能与代理分工

1. `shared/agent-skill-boundaries.md`
2. `skills/find-skills/SKILL.md`
3. `skills/find-agents/SKILL.md`

## 维护约定

- 不要改动 `.claude/skills/`、`.claude/agents/`、`.claude/commands/` 的顶层命名约定。
- 若新增共享规范，优先放在 `shared/`，避免把说明性内容散落到多个 skill/agent。
- 若更新路径约定，必须同步检查 `README.md`、`rules/`、`templates/`、`checklists/` 中的链接。
