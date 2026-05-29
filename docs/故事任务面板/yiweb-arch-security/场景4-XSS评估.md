# 场景4 · XSS 评估 — 检查内容清洗安全性

> v2.0.0 | 2026-05-29 | deepseek-v4-pro | feat/traceability-graph

> **故事**: [← 故事任务](./故事任务.md) · **上个场景**: [← 场景3·认证排查](./场景3-认证排查.md)
  [§1 使用场景](#sec1) · [§2 技术评审](#sec2) · [§3 测试设计](#sec3) · [§4 实施报告](#sec4) · [§5 测试报告](#sec5) · [§6 自改进](#sec6) · [§7 关联源码](#sec7)


### 主要价值
- 🔗 场景自包含：单场景即可理解完整操作流
- 📊 溯源可验证：每个引用关联到具体源码位置
- 🧪 测试门禁清晰：AC 与 Gate 判定标准明确
- 🔍 基线可追溯：设计决策关联到故事任务与 CLAUDE.md


## §1 使用场景

| 维度 | 内容 |
|------|------|
| **角色** | 收到 XSS 漏洞报告的安全审查者 |
| **前置** | 有潜在跨站脚本攻击的报告 |
| **操作流** | 检查 SanitizePlugin 是否启用 → 插件已启用? → 检查插件在链中的排序是否为第一位 → 排序正确? → 检查输入面是否有未校验的输入点 → 检查是否有绕过清洗插件的渲染路径 → 汇总风险评估结果 |
| **后置** | 确认所有动态内容的渲染路径均经过安全清洗 |
| **异常** | 发现绕过清洗插件的渲染路径 → 标记为高风险，立即封堵 |

## §2 技术评审

| 评审项 | 结论 | 说明 |
|--------|------|------|
| SanitizePlugin 启用 | 通过 | SanitizePlugin 文件存在且已注册 |
| 插件排序 | 通过 | SanitizePlugin 在插件列表中排序首位 |
| 无裸 innerHTML | 通过 | 全局搜索 innerHTML 结果在安全清洗插件内部 |

### 渲染安全链

| 环节 | 机制 | 关键文件 | 排序要求 |
|------|------|---------|---------|
| 内容输入 | 原始内容进入渲染器 | `MarkdownRenderer.js` | — |
| 安全清洗 | SanitizePlugin 过滤恶意标签 | `SanitizePlugin.js` | 第 1 位 |
| 图表渲染 | MermaidPlugin 处理图表 | `MermaidPlugin.js` | 第 2+ 位 |
| 目录生成 | TocPlugin 生成目录 | `TocPlugin.js` | 第 2+ 位 |
| 界面输出 | 清洗后内容渲染到 DOM | `MarkdownRenderer.js` | — |

## §3 测试设计

| AC# | Given | When | Then | 门禁 |
|-----|-------|------|------|------|
| AC1 | cdn/markdown/plugins/ 目录存在 | 检查 SanitizePlugin.js | 文件存在 | Gate A |
| AC2 | PluginSystem.js 可读 | grep SanitizePlugin 引用 | SanitizePlugin 被导入和注册 | Gate A |
| AC3 | 源码可搜索 | grep 全项目 `innerHTML` | 0 结果或全部在安全清洗插件内部 | Gate A |

## §4 实施报告

| 任务 | 状态 | 产出 |
|------|:---:|------|
| SanitizePlugin 存在性 | ✅ | 文件存在 |
| 插件注册验证 | ✅ | 已导入和注册 |
| innerHTML 检查 | ✅ | 无裸 innerHTML 调用 |

## §5 测试报告

| AC# | 结果 | 证据 |
|-----|:---:|------|
| AC1 (文件存在) | ✅ | `cdn/markdown/plugins/SanitizePlugin.js` |
| AC2 (已注册) | ✅ | PluginSystem 中 SanitizePlugin 首位注册 |
| AC3 (innerHTML) | ✅ | 0 裸 innerHTML 调用 |

## §6 自改进

| 发现 | 改进项 | 状态 |
|------|--------|:---:|
| SanitizePlugin 清洗规则未文档化 | 补充允许/禁止的标签和属性清单 | 📋 |
| 新型 XSS 向量可能绕过当前规则 | 定期审查 SanitizePlugin 配置 | 📋 |

## §7 关联源码

| 类型 | 文件 | 关键内容 | 说明 |
|------|------|---------|------|
| 开发 | `cdn/markdown/plugins/SanitizePlugin.js` | DOMPurify 配置 | XSS 防护核心 |
| 开发 | `cdn/markdown/core/MarkdownRenderer.js` | `renderMarkdownHtml()` | 渲染入口 |
| 开发 | `cdn/markdown/core/PluginSystem.js` | 插件注册顺序 | SanitizePlugin 首位保证 |
| 开发 | `src/views/aicr/hooks/methods/inputMethods.js` | 用户输入入口 | 输入→渲染链路 |
| 测试 | — | XSS 测试需安全专家审查 | 渲染面安全检查 |

---
> **变更记录**: v2.0.0 — 合并 使用场景+技术评审+测试设计+实施报告+测试报告+自改进 为单一场景文档 (2026-05-29)
