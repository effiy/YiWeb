# YiWeb Design System

> 基线文档，rui init 生成 | 2026-05-07

## 设计语言

**简洁、通用、可复用**。Vue 3 CDN 多页面应用，视觉风格中性通用，组件库跨应用共享。

## Design Tokens

### 颜色
CSS 变量定义在 `cdn/styles/theme.css`：
- 背景: `#ffffff` / `#f5f5f5`
- 主色调: 蓝色 `#1890ff`
- 成功: `#52c41a`, 警告: `#faad14`, 错误: `#ff4d4f`
- 文字: `#1f2937` primary, `#6b7280` secondary, `#9ca3af` disabled
- 边框: `#e5e7eb`

### 间距
- 基础单位: 4px
- 组件内边距: 8px / 12px / 16px
- 页面边距: 16px / 24px

### 圆角
- 按钮: 6px
- 卡片: 8px
- 对话框: 12px
- 输入框: 6px

### 字体
- 系统字体栈: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- 代码: "SF Mono", Monaco, Consolas, monospace
- 字号: 12px(辅助) / 14px(正文) / 16px(标题) / 20px(大标题)

## 组件

### 通用组件 (`cdn/components/common/`)
| 组件 | 说明 |
|------|------|
| YiButton | 按钮（primary/default/dashed/text） |
| YiModal | 模态对话框 |
| YiForm | 表单（输入框/选择器/开关） |
| YiToast | 轻提示 |
| YiLoading | 加载中（spinner/skeleton） |
| YiTag | 标签/徽章 |
| YiEmpty | 空状态占位 |
| YiPagination | 分页 |

### 业务组件 (`cdn/components/business/`)
| 组件 | 说明 |
|------|------|
| MarkdownView | Markdown 渲染（插件架构） |
| SearchHeader | 搜索栏组件 |
| SkeletonLoader | 骨架屏加载 |

## 页面模板

**AICR 审查页面**:
```
┌─ 页面容器 ─────────────────────┐
│ [搜索栏] [过滤器] [新建]        │
├─────────────────────────────────┤
│ ┌──────┐ ┌──────────────────┐ │
│ │ 列表 │ │ 详情面板         │ │
│ │ 左侧 │ │ Markdown/Mermaid │ │
│ │ 导航 │ │ 渲染内容         │ │
│ └──────┘ └──────────────────┘ │
└─────────────────────────────────┘
```

**品牌首页**:
```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│       品牌 Logo + 描述       │
│    [AICR] [其他工具] ...     │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

## 交互

- 列表: 点击行展开详情，支持键盘上下导航
- 搜索: 输入即时过滤，300ms 防抖
- Markdown: 插件化渲染引擎，支持自定义扩展
- Mermaid: 图表动态渲染，支持缩放/导出
- 环境切换: local/prod 一键切换，配置中心 `src/core/config.js`

## 无障碍 (a11y)

- 语义化 HTML（button, nav, main, aside）
- 表单控件关联 label
- 焦点管理: 弹层自动聚焦，Esc 关闭
- 色彩对比度 ≥ 4.5:1

## 响应式

- 断点: 1024px (桌面), 768px (平板), 480px (手机)
- 桌面: 左右两栏布局
- 平板: 堆叠布局
- 手机: 单栏全宽，底部导航

## 图标

- 内联 SVG 组件
- 无外部图标库依赖
