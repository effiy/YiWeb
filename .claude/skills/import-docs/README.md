# import-docs 快速索引

`import-docs` 用于把本地文档批量导入 YiAi / YiDocs。行为真源在 `SKILL.md`，实际导入由 `scripts/import-docs.js` 执行。

在 `generate-document` / `implement-code` 的完成阶段，本 skill 是 `wework-bot` 之前的强制步骤：先同步 `docs`，再把 created / overwritten / failed 结果写入企业微信完成通知。

## 快速开始

```bash
API_X_TOKEN=*** node .claude/skills/import-docs/scripts/import-docs.js \
  --dir docs \
  --exts md \
  --prefix Projects,YiWeb
```

兼容旧入口：

```bash
node .claude/import-docs.js --dir docs --prefix Projects,YiWeb
```

## 文件职责

| 文件 | 职责 |
|------|------|
| `SKILL.md` | 何时使用、输入参数、工作流程 |
| `rules/import-contract.md` | 路径生成、覆盖、去重与安全约束 |
| `scripts/import-docs.js` | CLI 实现 |

## 常用参数

- `--dir, -d`：导入目录，默认当前目录
- `--exts, -e`：扩展名，默认 `md`
- `--token, -t`：API X-Token，默认读取 `API_X_TOKEN`
- `--api-url, -a`：API 地址，默认 `https://api.effiy.cn`
- `--prefix, -p`：远端路径前缀，逗号分隔

特殊规则：

- 当 `--dir` 是 `.claude` 或 `.cursor` 时，`--exts` 会被忽略，脚本始终递归导入目录下所有文件。


## 列举 docs 文件

在执行导入前，先列出 `docs/` 文件名用于用户多选：

```bash
node .claude/skills/import-docs/scripts/import-docs.js list
```

可选参数与导入命令一致，例：

```bash
node .claude/skills/import-docs/scripts/import-docs.js list --dir docs --exts md
```

`list` 仅打印文件清单，不会调用远端 API，也不需要 `API_X_TOKEN`。

## 标准链路

```bash
API_X_TOKEN=*** node .claude/skills/import-docs/scripts/import-docs.js \
  --dir docs \
  --exts md
```

导入完成后，将结果交给 `wework-bot` 的 `☁️ 文档同步` 行；若 `docs` 不存在则跳过并记录为“docs 不存在，跳过导入”。
