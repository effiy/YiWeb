# YiWeb-10-交互日志

## 执行概要

| 项目 | 值 |
|------|-----|
| 故事 | unify-icons |
| 描述 | 统一图标库，将项目中的图标放在 cdn 里统一管理 |
| 管线 | doc → code → 交付 |
| 状态 | ✅ 完成 |

## 阶段记录

### doc 阶段 (2026-05-19)

- PM 拆解为 3 个子故事：S1 iconMap+YiIcon、S2 视图迁移、S3 工具迁移
- Coder 补齐前端技术评审 (04) 和测试用例评审 (05)
- 产出 4 份基线文档

### code 阶段 (2026-05-19)

**S1 — iconMap + YiIcon 组件** ✅
- 创建 `/cdn/icons/iconMap.js`：57 个语义名 → Font Awesome CSS 类映射，作为项目图标单一真相源
- 创建 `/cdn/icons/YiIcon/` 组件：`<yi-icon name="search" spin size="lg">` 语义化图标接口
- 图标分类：操作(15) / 导航(7) / 文件(8) / 状态(6) / 视图(3) / 品牌(4) / 杂项(14)

**S2 — 视图层迁移** ✅
- aicr 视图：codeView(14)、aicrCodeArea(3)、keyboardShortcutsHelp(3)、AiModelSelector(6)、fileTree(7)、fileTreeNode(7)、sessionListTags(8)、sessionChatContextShared.welcomeCard(2)、aicrHeader(1)、aicrSidebar(2)
- storyPanel 视图：storyPanelPage(6)、storyListTable(3)、storyDetailCard(3)
- 注册 YiIcon 到两个视图的组件列表

**S3 — 工具/组件层迁移** ✅
- YiButton：图标 prop 支持语义名和兼容旧 FA 类
- YiErrorState / YiEmptyState：新增 resolvedIconClass 计算属性，支持语义名
- SearchHeader：新增 resolvedHomeIconClass，内部 `<i>` 全部迁移为 `<yi-icon>`
- domain.js：15 个 icon 属性值改为语义名

**验收审计** ✅
- `grep -rn "fa[bsr] fa-" --include='*.html' --include='*.js' src/ cdn/ | grep -v iconMap.js | grep -v YiIcon` → 0 结果

## 变更清单 (28 文件)

### 新增 (4)
- `cdn/icons/iconMap.js`
- `cdn/icons/YiIcon/index.js`
- `cdn/icons/YiIcon/template.html`
- `cdn/icons/YiIcon/index.css`

### 修改 (24)
- `cdn/components/common/buttons/YiButton/index.js`
- `cdn/components/common/buttons/YiButton/template.html`
- `cdn/components/common/feedback/YiErrorState/index.js`
- `cdn/components/common/feedback/YiErrorState/template.html`
- `cdn/components/common/feedback/YiEmptyState/index.js`
- `cdn/components/common/feedback/YiEmptyState/template.html`
- `cdn/components/business/SearchHeader/index.js`
- `cdn/components/business/SearchHeader/template.html`
- `cdn/utils/data/domain.js`
- `src/views/aicr/index.js`
- `src/views/aicr/components/aicrHeader/index.html`
- `src/views/aicr/components/aicrSidebar/index.html`
- `src/views/aicr/components/aicrCodeArea/index.html`
- `src/views/aicr/components/codeView/index.html`
- `src/views/aicr/components/AiModelSelector/index.html`
- `src/views/aicr/components/keyboardShortcutsHelp/index.html`
- `src/views/aicr/components/fileTree/index.html`
- `src/views/aicr/components/fileTree/fileTreeNode.js`
- `src/views/aicr/components/sessionListTags/index.html`
- `src/views/aicr/hooks/helpers/sessionChatContextShared.welcomeCard.js`
- `src/views/storyPanel/index.js`
- `src/views/storyPanel/components/storyPanelPage/template.html`
- `src/views/storyPanel/components/storyListTable/template.html`
- `src/views/storyPanel/components/storyDetailCard/template.html`

## 架构决策

- **向后兼容**：YiButton.icon、YiErrorState.iconClass、YiEmptyState.iconClass、SearchHeader.homeIconClass 均通过 `getIconClass` 解析，同时支持语义名（`refresh`）和旧 FA 类字符串（`fas fa-sync-alt`）
- **单一真相源**：新增图标只需在 iconMap.js 加一行；更换图标库只需改 iconMap.js 的映射值
- **零构建**：所有 CDN 模块为浏览器原生 ESM，无编译步骤

## 增量更新 (2026-05-19)

**T2 fix** — storyPanel 图标不显示
- 根因：YiIcon 使用 Options API `computed`，`this.name` 可能在某些环境下无法正确解析为 props 值
- 修复：将 `cdn/icons/YiIcon/index.js` 从 Options API `computed` 转换为 `setup()` + `Vue.computed()`，与 SearchHeader 模式一致
- `setup(props)` 直接访问 props 参数，显式追踪依赖
