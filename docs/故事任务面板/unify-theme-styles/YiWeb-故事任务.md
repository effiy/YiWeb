# YiWeb 故事任务

> 统一整个项目的主题样式

## 需求来源

用户需求 `/rui 统一整个项目的主题样式`

## 影响分析

| # | 影响点 | 影响级别 | 说明 |
|---|--------|---------|------|
| 1 | `cdn/styles/theme.css` | 高 | 设计系统令牌（`--yi-*`）定义文件，是统一的核心目标 |
| 2 | `cdn/styles/base/spacing.css` | 中 | 间距变量与 `theme.css` 存在冲突重复定义 |
| 3 | `cdn/styles/base/animations.css` | 中 | 动画变量与 `theme.css` 存在冲突重复定义 |
| 4 | `cdn/styles/utilities.css` | 低 | 含旧版后备值，需清理 |
| 5 | `cdn/styles/utils.css` | 低 | 含硬编码颜色值，需迁移 |
| 6 | `src/views/aicr/` 全部 CSS | 高 | 混合使用 `--yi-*` 和旧版变量，含硬编码回退值 |
| 7 | `src/views/claude/` 全部 CSS | 高 | 同上，含大量重复回退值 |
| 8 | `src/views/story/` 全部 CSS | 高 | 同上，含 `#A855F7` 等硬编码颜色 |
| 9 | `cdn/styles/components/syntax-highlight.css` | 低 | `--sh-*` 变量为独立系统，暂不纳入 |
| 10 | `cdn/components/` 组件 CSS | 中 | 共享组件需统一使用 `--yi-*` 令牌 |

## 当前状态

### 已存在问题

1. **重复变量定义**：`spacing.css` 和 `theme.css` 都定义了 `--spacing-*`、`--radius-*`，值不同（如 `--radius-sm` 在 spacing.css 为 8px，theme.css 为 4px）
2. **重复动画变量**：`animations.css` 和 `theme.css` 都定义了 `--transition-fast/normal/slow`，值不同
3. **两套命名空间**：新版 `--yi-*` 和旧版 `--*` 共存，旧版映射到新版但多处仍直接使用旧版
4. **过度使用回退值**：几乎所有 `var()` 调用都带了硬编码回退值（如 `var(--yi-text, #F8FAFC)`），形成视觉上的重复和不一致风险
5. **硬编码颜色**：`#fff`、`#A855F7`、`#1A2332`（不存在的变量回退值）散落各处
6. **独立滚动条样式**：每个视图重复定义相同的滚动条样式
7. **无用的 `@import` 重定向**：`cdn/styles/utils/typography.css` 仅包含一行重定向 import

### 目标状态

- 所有 CSS 变量定义集中在 `theme.css`，消除跨文件重复
- 全部视图和组件统一使用 `--yi-*` 命名空间
- 移除所有不必要的硬编码回退值
- 硬编码颜色替换为语义化 CSS 变量
- 滚动条样式全局统一，删除视图级重复定义
- 旧版 `--*` 变量标记 deprecated，逐步淘汰

---

## Story 1: 合并消除重复 CSS 变量定义

| 字段 | 内容 |
|------|------|
| 作为 | 前端开发者 |
| 我想要 | 消除 `spacing.css`、`animations.css` 与 `theme.css` 之间的重复 CSS 变量定义 |
| 以便 | 变量定义有唯一权威来源，避免因加载顺序导致的值覆盖和不确定性 |
| 优先级 | P0 |
| 范围边界 | 仅修改 `cdn/styles/` 下的变量定义文件，不改视图 CSS |
| 依赖 | 无 |

### §1.1 范围外

- 不修改任何视图级 CSS 文件
- 不修改组件 CSS
- 不修改 HTML 模板

### §5 AC

| AC# | Given | When | Then |
|-----|-------|------|------|
| AC1 | `spacing.css` 和 `theme.css` 存在重复的 `--spacing-*` 定义 | 执行合并 | `spacing.css` 仅保留工具类，变量引用 `--yi-space-*`；`theme.css` 为唯一变量定义源 |
| AC2 | `animations.css` 和 `theme.css` 存在重复的 `--transition-*` 定义 | 执行合并 | `animations.css` 仅保留关键帧动画，过渡变量引用 `--yi-duration-*` / `--yi-easing-*` |
| AC3 | `spacing.css` 的 `--radius-*` 与 `theme.css` 的 `--yi-radius-*` 冲突 | 执行合并 | `spacing.css` 移除 `--radius-*` 定义，工具类引用 `--yi-radius-*` |
| AC4 | 合并完成 | 浏览器加载页面 | 所有视图视觉效果无变化 |

---

## Story 2: 统一视图 CSS 使用 --yi-* 令牌

| 字段 | 内容 |
|------|------|
| 作为 | 前端开发者 |
| 我想要 | 将全部视图 CSS 中的样式引用统一为 `--yi-*` 命名空间 |
| 以便 | 消除旧版变量依赖，统一全项目视觉语言 |
| 优先级 | P0 |
| 范围边界 | 修改 `src/views/` 下全部 CSS 文件 |
| 依赖 | Story 1 完成 |

### §1.1 范围外

- 不修改 `cdn/styles/theme.css` 的变量定义（已在 Story 1 处理）
- 不修改 `cdn/components/` 组件 CSS（独立 Story）

### §5 AC

| AC# | Given | When | Then |
|-----|-------|------|------|
| AC1 | aicr 视图 CSS 混合使用 `--yi-*` 和旧版变量（如 `--spacing-lg`、`--radius-lg`、`--text-primary`）| 执行替换 | 全部替换为 `--yi-*` 等价变量，移除硬编码回退值 |
| AC2 | claude 视图 CSS 含大量 `var(--yi-*, #fallback)` 回退值 | 执行替换 | 移除回退值，仅保留 `var(--yi-*)` |
| AC3 | story 视图 CSS 含 `#A855F7`、`#fff`、`#1A2332` 等硬编码颜色 | 执行替换 | 替换为语义化 `--yi-*` 变量 |
| AC4 | 三个视图存在重复的滚动条样式定义 | 执行统一 | 移除视图级滚动条样式，依赖全局 `scrollbar.css` |
| AC5 | 替换完成 | 浏览器加载三个视图 | 视觉效果无退化 |

---

## Story 3: 统一共享组件 CSS

| 字段 | 内容 |
|------|------|
| 作为 | 前端开发者 |
| 我想要 | 将 `cdn/components/` 下全部组件 CSS 统一使用 `--yi-*` 令牌 |
| 以便 | 组件与视图使用一致的视觉语言 |
| 优先级 | P1 |
| 范围边界 | 修改 `cdn/components/` 下全部 CSS 文件 |
| 依赖 | Story 1 完成 |

### §5 AC

| AC# | Given | When | Then |
|-----|-------|------|------|
| AC1 | 共享组件 CSS 存在硬编码颜色 | 执行替换 | 全部替换为 `--yi-*` 变量 |
| AC2 | 替换完成 | 所有视图中的组件 | 视觉效果无退化 |

---

## Story 4: 清理旧版变量与无用代码

| 字段 | 内容 |
|------|------|
| 作为 | 前端开发者 |
| 我想要 | 清理无用的 CSS 文件和旧版变量引用 |
| 以便 | 减少维护负担，降低新人理解成本 |
| 优先级 | P2 |
| 范围边界 | 修改 `cdn/styles/` 下的文件 |
| 依赖 | Story 2、Story 3 完成 |

### §5 AC

| AC# | Given | When | Then |
|-----|-------|------|------|
| AC1 | `cdn/styles/utils/typography.css` 仅一行 import 重定向 | 执行清理 | 更新引用源直接指向 `base/typography.css`，移除此文件 |
| AC2 | `theme.css` 中旧版 `--*` 变量（deprecated 区）仍有引用 | 确认全部引用已迁移 | 旧版变量保留映射但不新增引用，加上更明确的注释 |
| AC3 | `utilities.css` 中工具类含旧版 fallback | 执行清理 | 移除旧版 fallback 值 |

---

## 风险与假设

| # | 风险/假设 | 类型 | 可能性 | 影响 | 缓解策略 |
|---|----------|------|--------|------|---------|
| 1 | 变量替换后视觉差异被遗漏 | 风险 | M | H | 逐 Story 完成后在浏览器中对比三个视图 |
| 2 | `spacing.css` 工具类被大量 HTML 通过类名引用 | 假设 | — | — | 只修改变量引用，不改变类名，确保向后兼容 |
| 3 | 旧版变量在 JS 中通过 `getComputedStyle` 引用 | 风险 | L | M | Grep 搜索 JS 中的变量名引用 |
| 4 | 移除 fallback 值后某处变量未定义导致样式丢失 | 风险 | L | M | 浏览器 DevTools 检查 computed styles |

## 约束

- 分支隔离：在 `feat/unify-theme-styles` 分支上操作
- 视觉效果零退化：每次修改后在浏览器中验证
- 不改变 HTML 模板结构
- 不改变 JS 逻辑
- 保留 `cdn/components/` 中的 `var()` fallback 以保持组件独立性
