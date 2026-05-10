---
paths:
  - ".claude/**"
---

# rui-claude Rules

1. 操作范围仅限 `.claude/` 目录，不得触及 `.claude/` 以外文件
2. sync 为覆盖式更新（rm -rf → rsync），执行前须确认用户意图
3. retro 复盘文档写入根项目 `docs/自改进故事面板/`，格式为 `<project>-<date>.md`
4. retro 仅分析本地 `.claude/` 结构，不连接远端
5. fix 无参数时只补齐基础设施骨架（`.mcp.json`、`settings.json`、`settings.local.json`、`templates/`），不得生成 CLAUDE.md、agents/、rules/、skills/ 等业务定义文件。fix --project `<name>` 时从根 `.claude/` 向子项目并集同步 skills/、rules/、agents/、templates/：默认缺失补齐（仅复制缺失文件），--sync 模式差异更新（缺失复制 + 内容差异时更新为根版本），--force 模式强制覆盖（无条件用根版本覆盖）。fix --all 批量同步全部子项目（支持 --sync/--force）。根 `.claude/` 是 skills/agents/rules/templates 的唯一权威来源，与具体业务无关。禁止同步 CLAUDE.md、README.md 等项目特定文件
6. 空输入不得自动执行管线，仅推荐任务
7. 禁止自动合并功能分支到 main，合并操作一律由开发者手动执行
8. SSH 凭据由系统管理员管理，本 skill 不配置、不存储、不传递
9. 禁止自动提交和推送：技能执行完毕后不得自动执行 git commit 或 git push，所有 git 操作一律由开发者手动执行
