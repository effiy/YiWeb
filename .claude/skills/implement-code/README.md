# implement-code 快速索引

`implement-code` 是 YiWeb 的代码实施主 skill。它负责按阶段编排实施流程，不再在主 `SKILL.md` 中重复承载所有细节规则。

## 阅读顺序

1. `../../shared/evidence-and-uncertainty.md`（与 `SKILL` 中原则 11 一致，约束总结与建议防幻觉）  
2. `./SKILL.md`  
   先看何时使用、输入前提、8 阶段总览、门禁与停止条件（含原则 12：场景—检查项覆盖预检）。  
3. `./rules/orchestration.md`  
   看阶段契约、文档预检、Grounding、**§3.4 02↔05 覆盖**、skill/agent 分派、MCP 探针与降级。
4. 按阶段进入对应规则文件：
   - 阶段 1：`./rules/e2e-testing.md` + `./rules/test-page.md`
   - 阶段 2 / 6：`./rules/verification-gate.md`
   - 阶段 3 / 4：`./rules/code-implementation.md`
   - 阶段 7 / 中途停止：`./rules/process-summary.md`
5. `./rules/artifact-contracts.md`  
   看文档集路径、测试产物路径、回写目标和状态字段的统一约定；阶段 7 完成或阻断时必须按这里回写 `01/02/03/04/05/07` 的实施状态。  
6. `../../shared/impact-analysis-contract.md`  
   看全项目影响链分析的范围、上游依赖、反向依赖、传递依赖、依赖闭合和 P0 门禁。

## 真源分工

| 文件 | 职责 |
|------|------|
| `SKILL.md` | 主编排器：适用条件、阶段总览、进入/退出门禁 |
| `README.md` | 导航入口：先读什么、按阶段看什么 |
| `rules/orchestration.md` | 阶段契约与编排细则 |
| `rules/artifact-contracts.md` | 产物路径、文件命名、回写目标 |
| `rules/e2e-testing.md` | 测试文件、Mock、MCP 验证细则 |
| `rules/test-page.md` | 原型测试页面结构规范 |
| `rules/verification-gate.md` | 阶段 2 / 6 门禁与修复循环 |
| `rules/code-implementation.md` | 阶段 3 / 4 编码约束、影响分析与自检 |
| `rules/process-summary.md` | `06_实施总结.md` 的结构与阻断总结 |
| `../../shared/impact-analysis-contract.md` | 全项目影响链分析范围、依赖闭合标准与 P0 门禁 |

## 核心约定

1. `SKILL.md` 只保留阶段编排与强门禁，不重复规则文件中的长模板、示例代码和报告格式。
2. 阶段编号以 `SKILL.md` 和 `rules/orchestration.md` 为准，其他规则文件不得自定义一套新的阶段映射。
3. 产物路径以 `rules/artifact-contracts.md` 为准；若与其他文件冲突，必须收敛到该文件后再继续修改。
4. 任意阶段阻断时，必须先生成 `docs/<功能名>/06_实施总结.md`，回写同功能目录文档状态，再停止流程。
5. 若连 `<功能名>` 或文档集路径都无法定位，必须写入 `docs/99_agent-runs/<YYYYMMDD-HHMMSS>_implement-code.md`，不得空跑。
6. 阶段 3 / 4 的影响分析必须覆盖全项目，追踪改动点的上游依赖、反向依赖、传递依赖、导出链、注册链、测试、文档、配置和外部依赖影响。
7. 代码实施完成后，必须更新同功能目录内相关文档的 `## 实施状态` 小节，并在 `06_实施总结.md` 的“状态回写记录”中归档。
8. **测试产物**（spec、原型页、fixtures、截图、trace 等）**必须**在仓库 `tests/` 目录下，规范见 `rules/e2e-testing.md` 与 `rules/artifact-contracts.md §2`。
9. `06_实施总结.md` 必须含 **AI 调用流程图** 与 **AI 调用时序图**（Mermaid），并满足 `rules/process-summary.md` 的 S0 约束与章节速查表；**§9.4/§9.5**（阻断时 **§8.3/§8.4**）为自我改进与可验证下一步，须证据驱动。  
10. 阶段 0 完成 `orchestration.md §3.4` 的覆盖预检，再进阶段 1，减少「有场景无 P0 检查项」导致的返工。
11. 每次调用结束前**必须**按技能先后调用 `import-docs` 与 `wework-bot`（先读各 `SKILL.md` 再执行），与 `SKILL.md`「强制最终步骤」及阶段 8 一致；不得省略任一技能或只跑脚本不读技能。
