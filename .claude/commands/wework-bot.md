调用 `wework-bot` 技能发送企业微信机器人消息。

参数：`$ARGUMENTS`

执行要求（加强）：
- 用户意图是“发群通知 / 企微推送”时，必须执行 `send-message.js` 真实发送，不得只停留在草稿。
- 长文案优先 `--content-file`，短文案可用 `--content`；正文需先按 `message-contract` 对齐。
- 与 `generate-document` / `implement-code` 联动时，顺序必须是：先 `import-docs`，再 `wework-bot`。
- 完成通知中的 `☁️ 文档同步` 必须引用刚执行 `import-docs` 的真实统计，不得写占位数字。
- 不得在命令或回复中泄露 `API_X_TOKEN`、webhook 明文。

请使用 Skill 工具调用 `wework-bot` 技能并实际发送，最后返回发送结果与关键摘要。
