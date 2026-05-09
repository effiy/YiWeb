---
paths:
  - ".claude/**"
---

# rui-claude Rules

1. 操作范围仅限当前项目 `.claude/` 目录，不得触及根目录的 `.claude/`，不得触及 `.claude/` 以外文件
2. sync 为覆盖式更新（rm -rf → rsync），执行前须确认用户意图
3. retro 复盘文档写入根项目 `docs/自改进故事面板/`，格式为 `<project>-<date>.md`
4. retro 仅分析本地 `.claude/` 结构，不连接远端
5. fix 只补齐基础设施骨架（`.mcp.json`、`settings.json`、`settings.local.json`、`templates/`），不得生成 CLAUDE.md、agents/、rules/、skills/ 等业务定义文件
6. 空输入不得自动执行管线，仅推荐任务
7. 禁止直接修改 `.claude/` 下内容，所有改动必须从 main 拉取 `feat/<name>` 分支进行
8. 禁止自动合并功能分支到 main，合并操作一律由开发者手动执行
9. SSH 凭据由系统管理员管理，本 skill 不配置、不存储、不传递
