---
name: import-docs
description: 将本地 Markdown 等文档批量导入 YiAi / YiDocs，调用随 skill 分发的 import-docs.js 脚本。用户要求导入 docs、同步文档到 YiAi、运行 import-docs 或配置 API_X_TOKEN 时使用。
---

# import-docs

## 定位

`import-docs` 是 YiWeb 的文档导入技能。它把原 `.claude/import-docs.js` 脚本纳入 skill 体系，负责：

1. 校验导入参数和凭据
2. 选择导入目录、扩展名、路径前缀和 API 地址
3. 支持 `list` 列举待选文档，便于用户多选后再执行导入
4. 调用 `scripts/import-docs.js`
5. 汇总创建、覆盖和失败结果，供 `wework-bot` 完成通知填写真实同步数字

## 何时使用

- 用户要求把 `docs/`、`.claude/` 或其他本地文档导入 YiAi / YiDocs
- 用户提到 `import-docs.js`、`API_X_TOKEN`、`--prefix`、`--api-url`
- 需要批量同步 Markdown 文档到远端文档库
- `generate-document` / `implement-code` 完成阶段需要同步 `docs`

## 输入

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `dir` | 当前目录 | 要遍历导入的目录 |
| `exts` | `md` | 逗号分隔的扩展名 |
| `token` | `API_X_TOKEN` | YiAi API 的 `X-Token` |
| `apiUrl` | `https://api.effiy.cn` | API 基础地址 |
| `prefix` | 空 | 远端路径前缀，逗号分隔 |
| `command` | `import` | `import` 导入文件；`list` 仅列举文件，不写入远端 |

## 工作流程

1. **参数解析**：从用户请求中提取目录、扩展名、前缀、API 地址和 token 来源。
2. **列举候选（可选）**：先用 `list` 输出 docs 文件名，给用户做多选。
3. **安全检查**：不得在回复中展示 token；执行 `import` 且缺少 token 时提示设置 `API_X_TOKEN` 或传入 `--token`。
4. **执行导入**：运行：

```bash
node .claude/skills/import-docs/scripts/import-docs.js --dir <目录> --exts <扩展名> --prefix <前缀>
```

5. **结果汇总**：向用户说明发现文件数、created / overwritten / failed 数量；若失败，列出失败文件和错误摘要。
6. **回传通知摘要**：当由 `generate-document` / `implement-code` 调用时，把结果整理为 `☁️ 文档同步：docs → YiAi（创建 N，覆盖 N，失败 N）`；`failed = 0` 时可省略失败字段。

## 运行示例

```bash
API_X_TOKEN=*** node .claude/skills/import-docs/scripts/import-docs.js \
  --dir docs \
  --exts md \
  --prefix Projects,YiWeb
```


## 列举 docs 文件（用于多选）

在导入前可先列出 `docs/` 下文件名，便于用户做多选任务：

```bash
node .claude/skills/import-docs/scripts/import-docs.js list
```

也可指定目录和扩展名：

```bash
node .claude/skills/import-docs/scripts/import-docs.js list --dir docs --exts md
```

`list` 命令只输出文件清单，不需要 `API_X_TOKEN`，不会写入远端。

## docs 标准导入（被 generate-document / implement-code 调用）

`generate-document` 和 `implement-code` 在每次执行结束时必须**先调用本技能**，对 `docs` 目录执行文档同步；随后再把真实结果交给 `wework-bot` 发送完成通知。标准命令为：

```bash
API_X_TOKEN=*** node .claude/skills/import-docs/scripts/import-docs.js \
  --dir docs \
  --exts md
```

执行规则：

1. **目录存在**：执行导入，把结果（创建 N、覆盖 N、失败 N）写入 wework-bot 完成通知的 `☁️ 文档同步` 行。
2. **目录不存在**：跳过导入，wework-bot 通知改为：`☁️ 文档同步：docs 不存在，跳过导入`。
3. **导入失败**：不阻断主流程交付；在 wework-bot 通知中注明失败文件数和错误摘要。

## 约束

- 默认只导入 Markdown，除非用户明确指定 `--exts`；但当 `--dir` 指向 `.claude` 或 `.cursor` 时，`exts` 过滤会被关闭，脚本始终导入目录下全部文件。
- 不要把 token 写入仓库文件、日志摘要或文档。
- 远端路径由 `prefix + 当前仓库目录名 + dir 名 + 相对路径` 组成，空格会替换为 `_`。
- 脚本会覆盖远端同路径文件；若 session 已存在，仅覆盖文件内容，不重复创建 session。

## 支持文件

- `README.md`：快速使用说明
- `rules/import-contract.md`：导入路径、去重和安全契约
- `scripts/import-docs.js`：实际 CLI 脚本
