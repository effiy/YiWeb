# YiWeb Design System

> 基线文档，rui init 生成 | 2026-05-07

## 设计语言

**专业、高效、开发者友好**。AI 代码审查工具，视觉风格服务于代码阅读和审查效率。

## Design Tokens

定义在 `cdn/styles/theme.css`：
- 背景: #ffffff (primary), #f5f5f5 (secondary)
- 主色: #2563eb (blue-600)
- 成功: #16a34a (green-600)
- 警告: #f59e0b (amber-500)
- 错误: #dc2626 (red-600)
- 文字: #1a1a1a (primary), #666666 (secondary)

### 间距
- 基础: 4px / 8px / 12px / 16px / 24px / 32px
- CSS 变量: `--spacing-xs` ~ `--spacing-xl`

### 字体
- 正文: system-ui, sans-serif
- 代码: JetBrains Mono, Fira Code, monospace
- 字号: 12px(辅助) 14px(正文) 16px(标题) 20px(H2)

## 组件

`cdn/components/` 共享组件库：

### 通用组件
| 组件 | 路径 | 说明 |
|------|------|------|
| YiButton | `common/` | 多 variant: primary/secondary/danger/ghost |
| YiModal | `common/` | 对话框 + 背景遮罩 |
| YiForm | `common/` | 表单容器 + 验证 |
| YiToast | `common/` | 消息通知(右上弹出) |
| YiBadge | `common/` | 标签/状态 |
| YiLoader | `common/` | 加载 spinner/skeleton |

### 业务组件
| 组件 | 路径 | 说明 |
|------|------|------|
| MarkdownView | `business/` | Markdown 渲染(代码高亮+表格+图表) |
| SearchHeader | `business/` | 搜索栏 |
| SkeletonLoader | `business/` | 骨架屏占位 |

## 页面模板

**AICR 审查页**:
```
[顶栏: 环境切换 + 设置]
[主体: 左右分栏]
├── [左侧 40%: 代码输入区]
│   ├── [语言选择器]
│   ├── [代码编辑器 textarea]
│   └── [审查维度 checkboxes]
└── [右侧 60%: 审查结果]
    ├── [Markdown 渲染结果]
    └── [操作: 复制/导出]
```

## 交互

- 代码提交: 按钮提交 → loading → 流式渲染结果
- 环境切换: 即时生效，无刷新
- 组件加载: 声明式注册 + 自动模板缓存
- 错误提示: Toast 3 秒自动消失
- 确认操作: Modal 确认

## 无障碍 (a11y)

- 语义化 HTML 标签
- Button: aria-label on icon-only
- Modal: aria-modal + focus trap
- 表单: label 关联 input

## 响应式

- 断点: 768px
- 桌面: 左右分栏
- 移动: 上下堆叠，代码区在上

## 图标

- Unicode 符号 + CSS 图标
- 无外部图标库依赖
