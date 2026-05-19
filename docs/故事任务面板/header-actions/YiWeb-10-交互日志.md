# YiWeb-10-交互日志

## 执行概要

| 项目 | 值 |
|------|-----|
| 故事 | header-actions |
| 描述 | 将 aicr 页面的 header-actions 做成组件，可供多个页面公用 |
| 管线 | code → 补充交付 |
| 状态 | ✅ 代码完成 |

## 阶段记录

### code 阶段 (2026-05-19)

- 恢复 HeaderActions 组件文件（index.js / template.html / index.css）
- 重构 SearchHeader 消费 HeaderActions：模板替换 `<div class="header-actions">` → `<header-actions>`，JS 移除 detectEnvironment / envType / envLabel / clearCache
- storyPanelPage 接入 HeaderActions：模板替换 `<div class="sp-header-right">` → `<header-actions>`，CSS 移除 .sp-header-right 和 .sp-clear-cache-btn
- 注册 HeaderActions 到 cdn/components/index.js、aicr/index.js、storyPanel/index.js

## 变更清单 (10 文件)

### 新增 (3)
- `cdn/components/business/HeaderActions/index.js` — 组件定义，环境检测 + 清缓存按钮 + 环境徽章
- `cdn/components/business/HeaderActions/template.html` — 组件模板，默认插槽 + 清缓存按钮 + 环境徽章
- `cdn/components/business/HeaderActions/index.css` — 组件样式（.header-actions, .header-icon-btn, .env-badge）

### 修改 (7)
- `cdn/components/business/SearchHeader/template.html` — `<div class="header-actions">` 替换为 `<header-actions>` 组件
- `cdn/components/business/SearchHeader/index.js` — 移除 detectEnvironment / envType / envLabel / clearCache（迁移到 HeaderActions）
- `src/views/storyPanel/components/storyPanelPage/template.html` — `<div class="sp-header-right">` 替换为 `<header-actions>`
- `src/views/storyPanel/components/storyPanelPage/index.css` — 移除 .sp-header-right 和 .sp-clear-cache-btn 规则
- `src/views/aicr/index.js` — 新增 HeaderActions 组件注册
- `src/views/storyPanel/index.js` — 新增 HeaderActions 组件注册
- `cdn/components/index.js` — 新增 HeaderActions 导出

## 架构决策

- **环境检测内置**: HeaderActions 内部 detectEnvironment()，消费者无需传递环境信息，自包含组件
- **事件冒泡链**: HeaderActions → `$emit('clear-cache')` → SearchHeader → `$emit('clear-cache')` → AicrHeader → handleClearCache
- **组件加载时序**: HeaderActions 模块在 SearchHeader 之前注册，waitForComponents 机制确保依赖先就绪
- **插槽设计**: 默认插槽位于清缓存按钮之前，页面特定按钮（auth/sidebar/search/视图切换）通过插槽注入
