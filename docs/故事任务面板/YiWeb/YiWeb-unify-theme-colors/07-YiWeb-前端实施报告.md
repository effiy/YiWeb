# 07 — 前端实施报告：统一主题色与基础组件

## 变更概览

| 项 | 内容 |
|---|---|
| 故事 | YiWeb-unify-theme-colors |
| 分支 | `feat/YiWeb-unify-theme-colors` |
| 变更类型 | 样式重构 + 组件优化 |
| 影响文件 | 35+ 个 CSS/JS 文件 |

## 实施模块

```mermaid
flowchart LR
    A[theme.css 根文件] --> B[补齐 RGB + hover token + 暗色覆盖]
    B --> C[CSS 逐文件迁移]
    C --> D[JS 动态样式收敛]
    D --> E[基础组件统一]
    E --> F[视图 focus 收敛]
    F --> G[静态验证]
    style A fill:#e3f2fd,stroke:#1565c0
    style G fill:#e8f5e9,stroke:#2e7d32
```

### 模块 A：theme.css 根文件调整

**变更点**：
- 新增 `--yi-code-bg-rgb`, `--yi-code-text-rgb`, `--yi-dark-surface-rgb`
- 新增 `--yi-dark-text-secondary-rgb`, `--yi-dark-text-muted-rgb`, `--yi-dark-border-subtle-rgb`
- 新增 `--gray-700-rgb`
- 新增语义 hover token：`--yi-success-hover`, `--yi-warning-hover`, `--yi-danger-hover`, `--yi-info-hover`
- 新增 `--yi-code-font-size`
- `@media (prefers-color-scheme: dark)` 中新增 `yi-*` 文本覆盖：`--yi-text-secondary: #CBD5E1`
- 遗留映射段标记 `@deprecated`
- `:root` 通用 token 默认值改为暗色优先
- 新增 `@media (prefers-color-scheme: light)` 恢复全部亮色值

**文件**：`cdn/styles/theme.css`

### 模块 B：CSS 逐文件迁移

**迁移范围**（按依赖从底向上）：

| 文件 | 变更量 | 关键替换 |
|------|--------|---------|
| `fileTreeLayout.css` | 23 处 | `--bg-secondary`→`yi-code-bg`, `#059669`→`yi-success-hover` 等 |
| `fileTreeTreeBase.css` | 11 处 | `--text-primary`→`yi-code-text`, `--primary`→`yi-primary` |
| `fileTreeTreeExtras.css` | 15 处 | `--border-secondary`→`yi-border-focus`, `--warning`→`yi-warning` |
| `fileTreeTags.css` | 12 处 | `--border-primary`→`yi-border`, `--danger-color`→`yi-danger` |
| `layout.css` | 31 处 | `#fff`→`yi-text-on-primary`, `--bg-tertiary`→`gray-700` |
| `index.css` | 18 处 | `--bg-primary`→`yi-dark-surface`, `rgba(234,179,8)`→`rgba(yi-warning-rgb)` |
| `codePage.css` | 14 处 | `#3b82f6`→`yi-primary`, `--pet-chat-main-color` 收敛 |
| `codePage.contextModals.css` | 42 处 | `rgba(var(--bg-primary-rgb))`→`rgba(var(--yi-dark-surface-rgb))` |
| `keyboardShortcutsHelp/index.css` | 24 处 | 全面替换遗留变量 |
| `aicrHeader/index.css` | 2 处 | `--bg-secondary`→`yi-code-bg` |
| `AiModelSelector/index.css` | 8 处 | fallback 值规范化 |
| `sessionListTags/index.css` | 6 处 | `--danger`→`yi-danger` 等 |
| `codeView/index.css` | 1 处 | fallback 规范化 |

**总计**：123 处遗留变量替换 + 28 处硬编码颜色替换

### 模块 C：JS 动态样式收敛

| 文件 | 变更 | 策略 |
|------|------|------|
| `resizer.js` | `rgba(59,130,246)`→`rgba(37,99,235)` | 对齐 `--yi-primary` |
| `sessionChatContextMethods.js` | `#fff`, `rgba(0,0,0)` 等 | 语义变量替换 |
| `sessionChatContextShared.js` | `rgba(0,0,0)`, `#fff` | 语义变量替换 |
| `tagManagerMethods.js` | `#6366f1`, `#4f46e5`, fallback 值 | 收敛至 `--yi-primary` / `--yi-primary-hover` |
| `codeView/index.js` | `rgba(0,0,0)`, `rgba(255,255,255)` | 语义变量替换 |

### 模块 D：基础组件统一

#### 新建组件

| 组件 | 路径 | 说明 |
|------|------|------|
| YiInput | `cdn/components/common/forms/YiInput/` | 统一输入框，支持 size(sm/md/lg)、variant(error)、v-model |
| YiTextarea | `cdn/components/common/forms/YiTextarea/` | 统一文本域，支持 size(sm/md/lg)、variant(error)、resize |

#### 组件优化

| 组件 | 变更项 | 说明 |
|------|--------|------|
| YiButton | `variant` 追加 `accent` | 校验器与 CSS 对齐 |
| YiButton | 补充 `.btn-block` | 宽度 100% |
| YiButton | 补充 `.btn-lg` min-height | 52px，与 lg 控件 scale 对齐 |
| YiIconButton | 新增 `size` 属性 | sm(36px) / md(44px) / lg(52px) |
| YiIconButton | 新增 `variant` 属性 | primary / ghost |
| YiIconButton | 统一基线尺寸 | 40px → 44px，与 YiButton(md) 对齐 |
| YiTag | `variant` 追加 `accent` | 校验器与 CSS 对齐 |
| YiTag | 尺寸命名统一 | small/large → sm/lg |
| YiTag | `.tag-sm` min-height | 22px → 24px |
| YiSelect | 新增 `size` 属性 | sm(36px) / md(44px) / lg(52px) |
| YiSelect | CSS 类名修复 | `.select-trigger` → `.select`，解决模板与样式不匹配 |
| YiSelect | option 级联尺寸 | 跟随触发器尺寸缩小/放大 |

### 模块 E：视图级 focus 收敛

| 文件 | 变更项 | 说明 |
|------|--------|------|
| `codePage.contextModals.css` | 6 处输入 focus 状态 | 统一使用 `var(--yi-border-focus)` + `var(--yi-shadow-focus)` |
| `codePage.css` | pet-chat focus 变量 | `--pet-chat-textarea-focus-border/shadow` 收敛至 yi-* Token |
| `layout.css` | search-input focus | `box-shadow` 收敛至 `var(--yi-shadow-focus)` |
| `src/views/aicr/index.js` | 注册新组件 | YiInput、YiTextarea |
| `cdn/components/index.js` | 导出新组件 | YiInput、YiTextarea |

### 模块 F：默认暗色主题适配

**问题**：`:root` 中通用 token（`yi-bg`/`yi-surface`/`yi-text` 等）原为亮色优先值，默认状态下暗色背景与亮色 token 不匹配。

**变更点**：

| Token | 原值（亮色） | 新默认值（暗色） | Light 覆盖 |
|-------|-------------|----------------|-----------|
| `--yi-bg` | `#F8FAFC` | `#0F172A` | `@media (prefers-color-scheme: light)` 恢复 |
| `--yi-surface` | `#FFFFFF` | `#1E293B` | 同上 |
| `--yi-surface-elevated` | `#FFFFFF` | `#334155` | 同上 |
| `--yi-surface-hover` | `#F1F5F9` | `#334155` | 同上 |
| `--yi-surface-active` | `#E2E8F0` | `#475569` | 同上 |
| `--yi-border` | `#E2E8F0` | `rgba(255,255,255,0.1)` | 同上 |
| `--yi-border-subtle` | `#F1F5F9` | `rgba(255,255,255,0.06)` | 同上 |
| `--yi-border-focus` | `#2563EB` | `#3B82F6` | 同上 |
| `--yi-text` | `#0F172A` | `#F8FAFC` | 同上 |
| `--yi-text-secondary` | `#475569` | `#CBD5E1` | 同上 |
| `--yi-text-muted` | `#94A3B8` | `#94A3B8` | 不变 |
| `--yi-primary-subtle` | `#EFF6FF` | `rgba(37,99,235,0.15)` | 同上 |
| `--yi-success-subtle` | `#ECFDF5` | `rgba(16,185,129,0.15)` | 同上 |
| `--yi-warning-subtle` | `#FFFBEB` | `rgba(245,158,11,0.15)` | 同上 |
| `--yi-danger-subtle` | `#FEF2F2` | `rgba(239,68,68,0.15)` | 同上 |
| `--yi-info-subtle` | `#ECFEFF` | `rgba(6,182,212,0.15)` | 同上 |
| `--yi-shadow-*` | `rgba(15,23,42,0.05)` | `rgba(0,0,0,0.3~0.4)` | 同上 |

**暗色/亮色媒体查询翻转**：
- 移除 `@media (prefers-color-scheme: dark)` 中对 `yi-*` 的覆盖（默认已是暗色）
- 新增 `@media (prefers-color-scheme: light)` 恢复所有亮色值
- 高对比度模式同步更新为暗色优先值

**对比度验证**：

| 组合 | 对比度 | 结果 |
|------|--------|------|
| `yi-text` on `yi-bg` | 17.06 | PASS |
| `yi-text` on `yi-surface` | 13.98 | PASS |
| `yi-text-secondary` on `yi-surface` | 9.85 | PASS |
| `yi-text-muted` on `yi-surface` | 5.71 | PASS |
| `yi-text` on `yi-surface-elevated` | 9.90 | PASS |

### 模块 G：静态验证

- **TC-02**（遗留变量清零）：`grep` 结果为 0 处 ✓
- **TC-03**（硬编码清零）：非图标类直接硬编码为 0 处 ✓
- **TC-04**（JS 收敛）：直接硬编码为 0 处 ✓
- **TC-09**（token 可用性）：未定义变量扫描为 0 处 ✓
- **JS 语法检查**：全部通过 ✓
- **组件级检查**：YiInput/YiTextarea/YiButton/YiIconButton/YiTag/YiSelect 结构与 Token 使用正确 ✓

## 统一尺寸 Scale

| 层级 | 高度 | 组件 |
|------|------|------|
| sm | 36px | YiButton-sm、YiIconButton-sm、YiInput-sm、YiSelect-sm |
| md | 44px | YiButton、YiIconButton、YiInput、YiSelect |
| lg | 52px | YiButton-lg、YiIconButton-lg、YiInput-lg、YiSelect-lg |

### YiTag 独立 Scale（标签视觉层级不同）

| 层级 | 高度 |
|------|------|
| sm | 24px |
| md | 28px |
| lg | 36px |

## 已知限制

- **TC-05~07**（浏览器视觉回归）：零构建项目需人工浏览器验证，本次未执行（无自动化浏览器测试框架）
- **局部变量**：`--pet-chat-*` 系列为业务局部变量，未纳入主题系统，保持原有行为
- **视图内联输入**：`.aicr-session-settings-input`、`.aicr-session-faq-search-input`、`.pet-chat-textarea` 尚未完全替换为 YiInput/YiTextarea 组件，仅收敛了 focus 状态 Token

## 回滚

```bash
git checkout main
# 或
git revert HEAD
```
