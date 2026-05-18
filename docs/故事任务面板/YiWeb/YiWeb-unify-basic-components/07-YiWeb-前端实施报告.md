# 07 — 前端实施报告：优化统一基础组件大小与配色

## 实施概览

| 字段 | 值 |
|------|-----|
| 项目 | YiWeb |
| 故事 | YiWeb-unify-basic-components |
| 分支 | `feat/YiWeb-unify-basic-components` |
| 实施日期 | 2026-05-17 |

## 变更清单

### 新建组件

| 组件 | 路径 | 说明 |
|------|------|------|
| YiInput | `cdn/components/common/forms/YiInput/` | 统一输入框，支持 size(sm/md/lg)、variant(error)、v-model |
| YiTextarea | `cdn/components/common/forms/YiTextarea/` | 统一文本域，支持 size(sm/md/lg)、variant(error)、resize |

### 组件优化

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

### 视图收敛

| 文件 | 变更项 | 说明 |
|------|--------|------|
| `codePage.contextModals.css` | 6 处输入 focus 状态 | 统一使用 `var(--yi-border-focus)` + `var(--yi-shadow-focus)` |
| `codePage.css` | pet-chat focus 变量 | `--pet-chat-textarea-focus-border/shadow` 收敛至 yi-* Token |
| `layout.css` | search-input focus | `box-shadow` 收敛至 `var(--yi-shadow-focus)` |
| `src/views/aicr/index.js` | 注册新组件 | YiInput、YiTextarea |
| `cdn/components/index.js` | 导出新组件 | YiInput、YiTextarea |

## 关键代码片段

### YiInput 组件规范

```css
.yi-input {
  min-height: 44px;
  padding: var(--yi-space-2) var(--yi-space-3);
  border: 1px solid var(--yi-border);
  background: var(--yi-surface);
  color: var(--yi-text);
  border-radius: var(--yi-radius-md);
}
.yi-input:focus-visible {
  border-color: var(--yi-border-focus);
  box-shadow: var(--yi-shadow-focus);
}
```

### 统一尺寸 Scale

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

## 已知局限

- 模态框内联输入（`.aicr-session-settings-input` 等）尚未完全替换为 YiInput 组件，仅收敛了 focus 状态 Token
- 聊天输入域（`.pet-chat-textarea`）因存在复杂自定义变量体系，本次仅收敛 focus 相关 Token
- 全部内联输入组件化替换建议作为后续 story 推进
