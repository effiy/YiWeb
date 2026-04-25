# generate-document 快速索引

`generate-document` 是 YiWeb 的文档生成主 skill。行为真源在 `SKILL.md`，本文件只保留快速开始、目录索引和常用入口。

## 快速开始

```bash
/generate-document 生成一份"功能名"的需求文档
/generate-document 生成一份"功能名"的需求任务
/generate-document 生成一份"功能名"的设计文档
/generate-document 生成一份"功能名"的使用文档
/generate-document 生成一份通用文档，主题内容...
/generate-document 生成"简洁功能名-用户故事简短描述"的全文档
```

## 真源说明

- 行为真源：`./SKILL.md`
- 文档契约：`../../shared/document-contracts.md`
- 影响分析契约：`../../shared/impact-analysis-contract.md`
- 证据与反幻觉：`../../shared/evidence-and-uncertainty.md`（与 `checklists/通用文档.md` P0 证据类项一起约束采纳率）
- 路径约定：`../../shared/path-conventions.md`
- Skill / Agent 边界：`../../shared/agent-skill-boundaries.md`

## 文档类型一览

| 类型 | 模板 | 规范 | 单独生成路径 | 全文档路径 |
|------|------|------|-------------|-----------|
| 需求文档 | ✅ | ✅ | `docs/01_需求文档/` | `01_需求文档.md` |
| 需求任务 | ✅ | ✅ | `docs/02_需求任务/` | `02_需求任务.md` |
| 设计文档 | ❌ | ✅ | `docs/03_设计文档/` | `03_设计文档.md` |
| 使用文档 | ❌ | ✅ | `docs/04_使用文档/` | `04_使用文档.md` |
| 动态检查清单 | ❌ | ✅ | 仅全文档模式 | `05_动态检查清单.md` |
| 实施总结 | — | — | 不由本 skill 生成 | `06_实施总结.md` |
| 项目报告 | ❌ | ✅ | `docs/05_项目报告/` | `07_项目报告.md` |
| 通用文档 | ✅ | ✅ | `docs/` | — |

## 目录导航

- `rules/`：结构契约
- `templates/`：可选骨架
- `checklists/`：专项检查清单
- `checklist.md`：检查清单入口索引

## 使用原则

1. 先读 `SKILL.md`，再读具体 `rules/<类型>.md`。
2. 设计文档与动态检查清单禁用模板，只能基于规范和上游事实生成。
3. 需求任务与设计文档的影响分析必须按 `../../shared/impact-analysis-contract.md` 覆盖全项目、上游依赖、反向依赖、传递依赖、导出链、注册链、测试、文档、配置和外部依赖。
4. 所有路径和 agent 名称必须与仓库内真实文件保持一致，不得引用旧路径或虚构代理。
5. 每次调用都必须写入 `docs/` 下至少一个 Markdown 文件；无法确定目标文档时，写入 `docs/99_agent-runs/<YYYYMMDD-HHMMSS>_generate-document.md`。
6. 完成阶段必须先执行 `import-docs` 的 `docs` 标准导入，再调用 `wework-bot` 发送带真实同步数字的完成通知。
7. 全文档/需求任务产出应便于 `implement-code` 做 **02↔05 P0 覆盖** 核对：见 `implement-code` 的 `rules/orchestration.md §3.4` 与 `SKILL.md` 原则 12；避免场景与检查项脱钩。
