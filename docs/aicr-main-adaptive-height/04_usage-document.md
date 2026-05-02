# aicr-main-adaptive-height

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Document](./01_requirement-document.md) | [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [CLAUDE.md](../../CLAUDE.md)

[Feature Intro](#feature-intro) | [Quick Start](#quick-start) | [Operation Scenarios](#operation-scenarios) | [FAQ](#faq) | [Tips](#tips)

---

## Feature Introduction

AICR 页面主区域现在能够智能适配您的屏幕高度。无论您使用的是大屏幕显示器、笔记本电脑还是手机，页面都会自动占满整个可视区域，并在内容超出时提供流畅的滚动体验。

核心特性：🎯 自动占满屏幕、⚡ 流畅滚动体验、🔧 零配置即用

**目标用户**: 所有使用 AICR 代码审查页面的用户。

## Quick Start

### Prerequisites

- [ ] 使用现代浏览器（Chrome、Firefox、Safari、Edge 最新两个主版本）
- [ ] 屏幕分辨率不低于 320px 宽度

### 30-Second Onboarding

1. 打开 AICR 页面（`src/views/aicr/index.html`）
2. 观察页面是否占满整个浏览器窗口
3. 展开文件树中的多个文件夹
4. 若内容超出屏幕，使用鼠标滚轮或触摸滑动浏览

## Operation Scenarios

### Scenario 1: 桌面端全屏浏览

- **Applicable situation**: 在大屏幕显示器上进行代码审查
- **Operation steps**:
  1. 打开 AICR 页面
  2. 确认主区域（文件树 + 代码区）占满整个窗口
  3. 若文件较多，滚动查看全部内容
- **Expected results**: ✅ 页面无底部空白，内容完整可见
- **Notes**: 若侧边栏或代码区内容较多，它们会各自显示滚动条

### Scenario 2: 笔记本小屏幕使用

- **Applicable situation**: 在 13-14 寸笔记本上工作
- **Operation steps**:
  1. 打开 AICR 页面
  2. 展开多个文件夹节点
  3. 使用滚轮或触控板滚动
- **Expected results**: ✅ 滚动流畅，无内容截断
- **Notes**: 可折叠侧边栏或聊天面板以获得更大代码阅读空间

### Scenario 3: 手机/平板移动端查看

- **Applicable situation**: 外出时需要快速查看代码审查结果
- **Operation steps**:
  1. 在手机浏览器打开 AICR 页面
  2. 观察布局是否自适应屏幕
  3. 上下滑动浏览内容
- **Expected results**: ✅ 布局垂直堆叠，可正常滚动
- **Notes**: 移动端优先查看代码内容，文件树可折叠

### Scenario 4: 多标签/分屏工作

- **Applicable situation**: 将浏览器窗口分屏或缩放至较小尺寸
- **Operation steps**:
  1. 将浏览器窗口缩放到屏幕一半宽度
  2. 刷新页面
  3. 观察布局自适应
- **Expected results**: ✅ 布局自动切换为响应式模式，无水平溢出
- **Notes**: 窗口宽度 < 950px 时，文件树和代码区垂直堆叠

## FAQ

### 💡 Basics

**Q: 为什么以前页面底部会有空白？**
A: 以前 `#app` 使用 `min-height`，当内容较少时页面高度可能小于视口高度。现在已改为固定占满视口。

**Q: 滚动条样式会变吗？**
A: 不会。滚动条保持与现有设计系统一致的样式（6px 宽度，主题色滑块）。

### ⚙️ Advanced

**Q: 子区域（文件树、代码区）的滚动会受影响吗？**
A: 不会。它们保留各自的独立滚动容器，互不影响。

**Q: 这个变更会影响页面性能吗？**
A: 不会。仅修改了两个 CSS 属性，无性能开销。

### 🔧 Troubleshooting

**Q: 页面仍然无法占满全屏？**
A: 请检查：
1. 浏览器是否为最新版本
2. 是否开启了页面缩放（应设置为 100%）
3. 是否有浏览器插件强制修改了页面样式

**Q: 滚动条不显示？**
A: macOS 用户可能开启了"自动隐藏滚动条"系统设置（系统设置 → 外观 → 显示滚动条）。这是系统行为，非页面问题。

## Tips and Hints

💡 **实用技巧**
- 使用 `?` 键可快速打开快捷键帮助面板
- 在代码区按 `F` 可切换全屏模式，获得更大阅读空间
- 侧边栏和聊天面板均支持拖拽调整宽度

⌨️ **快捷键**
- `?` — 显示快捷键帮助
- `Esc` — 关闭模态框/退出全屏

📚 **最佳实践**
- 桌面端：保持侧边栏展开以便快速切换文件
- 小屏幕：优先折叠侧边栏，专注代码阅读
- 移动端：使用竖屏浏览，代码区自动适配

## Appendix

### 相关资源

- [AICR 页面入口](../../src/views/aicr/index.html)
- [主样式文件](../../src/views/aicr/styles/index.css)
- [布局样式文件](../../src/views/aicr/styles/layout.css)

## Postscript: Future Planning & Improvements

- 未来将支持 `dvh` 单位，进一步优化移动端体验
- 考虑根据用户偏好提供紧凑/舒适两种行高模式
