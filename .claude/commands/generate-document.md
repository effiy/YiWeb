调用 generate-document 技能生成文档。

参数：$ARGUMENTS

常用示例：

- `/generate-document <功能名>-<一句话描述>`：生成 `docs/<功能名>/` 下全文档编号集（01-05, 07）
- `/generate-document weekly`：生成周报（单文档），落盘到 `docs/周报/<YYYY-MM-DD>~<YYYY-MM-DD>/周报.md`（例：`docs/周报/2026-04-27~2026-05-03/周报.md`）
- `/generate-document weekly <日期或起止日期>`：按自然周（周一~周日）生成周报
- `/generate-document from-weekly docs/周报/<YYYY-MM-DD>~<YYYY-MM-DD>/周报.md`：从该周报「后期规划与改进」梳理需求，生成**多个** `docs/<功能名>/` 全文档编号集（01–05、07）；收尾仍为一次 `import-docs` + 一条汇总 `wework-bot`

请使用 Skill 工具调用 generate-document 技能，传入上述参数。