# YiWeb Design System

> Web 端视觉与交互规范

## 色彩

| Token | 值 | 用途 |
|-------|-----|------|
| Primary | `#2563EB` (Blue-600) | 主色调、链接、活跃状态 |
| Primary Light | `#3B82F6` (Blue-500) | Hover 状态 |
| Background Light | `#F8FAFC` (Slate-50) | 浅色模式背景 |
| Background Dark | `#0F172A` (Slate-900) | 深色模式背景 |
| Surface | `#FFFFFF` / `#1E293B` | 卡片、面板背景 |
| Text Primary | `#0F172A` / `#F8FAFC` | 正文 |
| Text Secondary | `#64748B` / `#94A3B8` | 辅助文字 |
| Border | `#E2E8F0` / `#334155` | 分割线、边框 |
| Success | `#16A34A` (Green-600) | P2 标记 |
| Warning | `#D97706` (Amber-600) | P1 标记 |
| Error | `#DC2626` (Red-600) | P0 标记 |

## 字体

| 属性 | 值 |
|------|-----|
| Font Stack | `Inter, -apple-system, system-ui, sans-serif` |
| Heading | 600 weight, 24px/32px (h1), 18px/26px (h2) |
| Body | 400 weight, 14px/22px |
| Code | `'JetBrains Mono', 'Fira Code', monospace` 13px |

## 间距

4px 基准体系: 4 / 8 / 12 / 16 / 24 / 32 / 48

## 圆角

| 元素 | 值 |
|------|-----|
| 卡片 | 8px |
| 按钮 | 4px |
| 标签/徽章 | 2px |
| 模态框 | 12px |

## 阴影

| 层级 | 值 |
|------|-----|
| 卡片 | `0 1px 3px rgba(0,0,0,0.08)` |
| 下拉 | `0 4px 8px rgba(0,0,0,0.1)` |
| 模态框 | `0 4px 12px rgba(0,0,0,0.12)` |

## 动效

| 场景 | 时长 | 缓动 |
|------|------|------|
| hover | 200ms | ease |
| transition | 300ms | ease-in-out |
| 骨架屏 | 1.5s | ease-in-out infinite |

## 响应式断点

| 断点 | 布局 |
|------|------|
| >= 1024px | 双栏 (主内容 + 侧栏) |
| < 1024px | 单栏堆叠 |
| < 768px | 紧凑模式 (减少间距) |

## 组件规范

### 代码差异视图
- 左右分栏 (旧/新), 差异行高亮
- 新增行: `#DCFCE7` 背景 (Green-100)
- 删除行: `#FEE2E2` 背景 (Red-100)
- 行号列: 48px 宽, `#F1F5F9` 背景

### 问题列表
- 右侧可折叠侧栏, 320px 宽
- 按严重程度排序: P0 → P1 → P2
- P0 红色左边框, P1 琥珀色, P2 绿色

### 加载状态
- SkeletonLoader 组件: 灰色脉冲, 圆角 4px
- 内容过渡: opacity 300ms ease-in-out
