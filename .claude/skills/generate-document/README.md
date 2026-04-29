# generate-document 快速索引

`generate-document` 是文档生成主 skill。行为真源在 `SKILL.md`，本文件只保留快速开始、目录索引和常用入口。

## 快速开始

```bash
/generate-document 简洁功能名-用户故事简短描述
```

周报（单文档命令）：

```bash
/generate-document weekly
```

- 落盘目录：`docs/简洁功能名/`，含 `01_需求文档.md` … `05_动态检查清单.md`、`07_项目报告.md`（`06_实施总结.md` 由 `implement-code` 写入，本技能不创建）。
- 本技能**不展示、不推荐**仅生成单份需求/设计等命令；与单文档平铺目录（如 `docs/01_需求文档/`）无交付关系，标交付仅为上述全文档编号集。

## 真源说明

- 行为真源：`./SKILL.md`
- 文档契约：`../../shared/document-contracts.md`
- 影响分析契约：`../../shared/impact-analysis-contract.md`
- 证据与反幻觉：`../../shared/evidence-and-uncertainty.md`（与 `checklists/通用文档.md` P0 证据类项一起约束采纳率）
- 路径约定：`../../shared/path-conventions.md`
- Skill / Agent 边界：`../../shared/agent-skill-boundaries.md`

## 全文档类型一览（`docs/<功能名>/`）

| 类型 | 模板 | 规范 | 文件名 |
|------|------|------|--------|
| 需求文档 | ✅ | ✅ | `01_需求文档.md` |
| 需求任务 | ✅ | ✅ | `02_需求任务.md` |
| 设计文档 | ❌ | ✅ | `03_设计文档.md` |
| 使用文档 | ❌ | ✅ | `04_使用文档.md` |
| 动态检查清单 | ❌ | ✅ | `05_动态检查清单.md` |
| 实施总结 | — | — | `06_实施总结.md`（非本 skill） |
| 项目报告 | ❌ | ✅ | `07_项目报告.md` |

## 扩展命令

- `weekly`：生成周报单文档，规则见 `rules/周报.md`，落盘到 `docs/周报/<YYYY-MM-DD>~<YYYY-MM-DD>/周报.md`（自然周周一至周日，例：`2026-04-27~2026-05-03/周报.md`）；结束时仍强制执行 `import-docs`→`wework-bot`。
- `from-weekly <周报路径>`：从周报「后期规划与改进优先级总表」拆解为多个 `docs/<功能名>/` 全文档集；映射表见 `docs/99_agent-runs/*_from-weekly.md`，全部完成后**一次** `import-docs` + **一条**汇总通知（详见 `SKILL.md`）。

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
5. 每次调用都必须写入 `docs/` 下至少一个 Markdown 文件；无法按全文档继续时，写入 `docs/99_agent-runs/<YYYYMMDD-HHMMSS>_generate-document.md`。
6. **每次调用结束后必须**：先按 `import-docs` 技能执行 `docs` 标准导入，再按 `wework-bot` 技能发送带真实 `☁️ 文档同步` 结果的完成通知；两步缺一不可（详见 `SKILL.md` 顶部「强制最终步骤」）。
7. 全文档产出应便于 `implement-code` 做 **02↔05 P0 覆盖** 核对：见 `implement-code` 的 `rules/orchestration.md §3.4` 与 `SKILL.md` 原则 12；避免场景与检查项脱钩。
