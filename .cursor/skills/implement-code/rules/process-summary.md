# 过程总结规范

> 本规范约束 implement-code 技能在**阶段 5（过程总结）**生成的总结文档内容与格式。  
> 总结文档的目的：**让任何人都能通过这份文档重现整个实施决策过程**。

---

## 1. 核心约束（P0）

| 编号 | 约束 |
|------|------|
| S0-1 | 总结文档 **必须** 保存到 `docs/00_rYr/<功能名>/实施总结.md`。 |
| S0-2 | 必须包含 Mermaid **工具调用流程图**（记录实际执行路径，非理想路径）。 |
| S0-3 | 必须包含 Mermaid **完整时序图**（Agent ↔ Skill ↔ 工具 ↔ 文件系统）。 |
| S0-4 | 必须包含**变更文件清单**（路径 + 变更类型 + 说明）。 |
| S0-5 | 必须包含**验证门禁结果归档**（原文引用阶段 3 报告）。 |
| S0-6 | 图表中的节点/参与者 **必须** 对应实际调用的工具，不得补充未调用的环节。 |

---

## 2. 文档结构（章节顺序不可变）

```markdown
# 实施总结：<功能名>

> 生成时间：<ISO 时间戳>  
> 关联文档：[需求任务](../需求任务.md) | [设计文档](../设计文档.md) | [动态检查清单](../动态检查清单.md)

## 1. 工具调用流程图

```mermaid
flowchart TD
  ...（实际调用路径）
```

## 2. 完整时序图

```mermaid
sequenceDiagram
  ...（完整交互时序）
```

## 3. 阶段执行摘要

| 阶段 | 状态 | 关键结果 | 耗时（估计） |
|------|------|---------|-------------|
| 阶段 0：解析 + 预检 | ✅ | ... | ... |
| 阶段 1：文档 Grounding | ✅ | ... | ... |
| 阶段 2：E2E 测试页面 | ✅ | ... | ... |
| 阶段 3：验证门禁 | ✅ | ... | ... |
| 阶段 4：代码实施 | ✅ | ... | ... |

## 4. 验证门禁结果归档

<!-- 原文引用阶段 3 的"门禁通过/阻断报告" -->

## 5. 变更文件清单

| 文件路径 | 变更类型 | 关联模块 | 说明 |
|---------|---------|---------|------|
| ... | 新增/修改/删除 | ... | ... |

## 6. 技能 / 代理调用记录

| 顺序 | 工具类型 | 名称 | 调用阶段 | 输入摘要 | 输出摘要 |
|------|---------|------|---------|---------|---------|
| 1 | Skill | find-skills | 阶段 0 | ... | ... |
| 2 | Agent | test-page-builder | 阶段 2 | ... | ... |
| ... | | | | | |

## 7. 未解决问题与后续建议

### P1 问题
- <文件>:<行> — <问题描述>（建议：<操作>）

### P2 优化建议
- <建议描述>

### 已知限制
- <说明>
```

---

## 3. 流程图要求

工具调用流程图必须：
- 展示实际执行路径（包括决策分支、循环次数）
- 用不同颜色区分节点类型：
  - 蓝色 (`fill:#e1f5ff`)：Skill 调用
  - 绿色 (`fill:#e6ffe6`)：Agent 调用
  - 黄色 (`fill:#fff3cc`)：实施阶段
  - 红色 (`fill:#ffcccc`)：决策/门禁节点
- 标注每个门禁的实际通过轮次（如"门禁通过（第 2 轮）"）
- 若有阻断后重新开始，展示循环路径

---

## 4. 时序图要求

完整时序图的参与者（Participants）：

```
participant User as 用户
participant Skill as implement-code Skill
participant FindSkills as find-skills Skill
participant FindAgents as find-agents Skill
participant E2ETesting as e2e-testing Skill
participant VerLoop as verification-loop Skill
participant CodeReview as code-review Skill
participant SearchFirst as search-first Skill（若调用）
participant TestPageBuilder as test-page-builder Agent
participant CodeReviewer as code-reviewer Agent
participant Architect as architect Agent（若调用）
participant ImplReporter as impl-reporter Agent
participant FS as 文件系统
participant Playwright as Playwright 测试
```

时序图必须覆盖：
1. 技能初始化和文档读取
2. 每个 Agent 的调用和响应
3. 每个 Skill 的调用时机
4. 文件写入（测试页面 + 项目代码 + 总结文档）
5. 验证门禁的判断和修复循环
6. Playwright 测试的执行和结果

---

## 5. 变更清单要求

变更类型定义：
- `新增`：全新创建的文件
- `修改`：在现有文件上增加/变更内容
- `删除`：阶段 2 测试原型页面（若在阶段 4 后清理）

必须包含的文件类型：
- 测试原型页面（`tests/e2e/pages/`）
- Playwright 测试文件（`tests/e2e/`）
- Store 文件（`src/stores/`）
- Composable 文件（`src/composables/`）
- 组件文件（`src/components/`）
- 注册文件（`src/stores/index.js`、`src/components/index.js`）
- 总结文档本身

---

## 6. 禁止事项

- ❌ 在流程图中添加实际未调用的工具节点
- ❌ 简化时序图（省略 Agent ↔ Skill 的往返消息）
- ❌ 变更清单遗漏任何写入/修改的文件
- ❌ 将门禁阻断报告替换为"成功通过"（必须如实记录实际轮次）
- ❌ 使用"待补充"占位未解决问题（必须写明已知问题或明确说明"无"）
