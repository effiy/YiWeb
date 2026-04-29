---
agent: knowledge-curator
last_updated: 2026-04-29T17:53:00Z
entry_count: 3
---

## 记忆条目

### 条目1：项目初始化最佳实践

**时间**：2026-04-29

**上下文**：执行 /generate-document init 命令

**可复用知识**：

1. init 命令的标准流程：
   - 步骤1：解析+规范检索（调用 spec-retriever）
   - 步骤2：上游Grounding+影响分析（读取项目代码）
   - 步骤3：专家生成（调用 architect、planner）
   - 步骤4：逐文档生成+自检（调用 mermaid-expert、code-reviewer、quality-tracker）
   - 步骤5：保存+知识策展（调用 knowledge-curator）
   - 步骤6：文档同步+通知（执行 import-docs、调用 wework-bot）

2. init 命令的交付物：
   - 10 个项目基础文件（CLAUDE.md、README.md、docs/architecture.md、docs/changelog.md、docs/devops.md、docs/network.md、docs/state-management.md、docs/FAQ.md、docs/auth.md、docs/security.md）
   - docs/项目初始化/ 下的 7 个全文档编号集（01-07）

3. 防幻觉要点：
   - 所有事实必须基于实际文件读取
   - 不确定的内容必须标注"待补充（原因：…）"
   - 代码路径必须真实存在于仓库中
   - 设计文档和动态检查清单禁用模板，仅使用规范

**来源**：本次 /generate-document init 执行

---

### 条目2：示例项目架构特点（去业务化）

**时间**：2026-04-29

**上下文**：扫描某个 Chrome 扩展类项目代码（与具体业务无关）

**可复用知识**：

1. 技术栈：
   - Chrome Extension Manifest V3
   - Vanilla JavaScript（零构建，直接加载运行）
   - Vue 3 (Global Build)
   - Tailwind CSS
   - marked（Markdown 解析）
   - turndown（HTML 转 Markdown）
   - mermaid（图表渲染）
   - chrome.storage.local（数据持久化）

2. 架构模式：
   - IIFE 模块封装，挂载到 `window.AppManager`（或类似全局命名空间）
   - 配置中心模式（如 `core/config.js` 暴露 `APP_CONFIG`）
   - Hooks 工厂模式（createStore + useComputed + useMethods）
   - 零构建架构（无需 npm install，直接加载源码）

3. 目录结构：
   - core/：核心模块（config、utils、api、constants、bootstrap）
   - modules/：功能模块（如 faq、mermaid、extension、chat、screenshot、session 等）
   - libs/：第三方库（vue.global.js、marked.min.js、turndown.js、mermaid.min.js、md5.js）
   - assets/：静态资源（styles、icons、images）

**来源**：本次代码扫描

---

### 条目3：待改进的流程点

**时间**：2026-04-29

**上下文**：本次 /generate-document init 执行后的反思

**可复用知识**：

1. 环境检查前置：
   - 建议在开始生成前先检查 API_X_TOKEN、wework-bot 配置
   - 提前告知用户需要配置的内容，避免最后才发现无法完成同步和通知

2. 即时验证：
   - 建议在生成动态检查清单后立即执行部分验证
   - 可以在实施总结中记录即时验证结果

3. agent 调用强化：
   - 本次主要是逻辑上调用 agent，可以更严格执行完整 agent 契约
   - 确保 impact-analyst、architect、planner 等 agent 都被正确调用

**来源**：本次执行的经验总结
