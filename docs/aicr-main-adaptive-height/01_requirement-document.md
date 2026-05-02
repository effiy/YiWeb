# aicr-main-adaptive-height

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [Usage Document](./04_usage-document.md) | [CLAUDE.md](../../CLAUDE.md)
>

[Feature Overview](#feature-overview) | [User Stories](#user-stories) | [Acceptance Criteria](#acceptance-criteria) | [Feature Details](#feature-details)

---

## Feature Overview

AICR（AI Code Review）页面采用 Vue 3 构建，主区域由 `aicr-header` 和 `aicr-main` 两部分组成。当前 `aicr-main` 虽然设置了 `flex: 1`，但在实际渲染中无法可靠地占满整个视口剩余高度，且 `overflow: hidden` 会导致超出内容被截断而无法滚动查看。

本功能旨在让 `aicr-main` 精确自适应整个屏幕的可用高度（视口高度减去 `aicr-header` 高度），并在内容超出时出现滚动条，确保用户在任何屏幕尺寸下都能完整访问文件树和代码区域的内容。

核心目标：🎯 占满视口、⚡ 无内容截断、📖 一致的体验

## User Stories and Feature Requirements

**Priority**: 🔴 P0 | 🟡 P1 | 🟢 P2

**One user story corresponds to one `docs/<feature-name>/` numbered set (01–05, 07).**

| User Story | Acceptance Criteria | Process-Generated Documents | Output Smart Documents |
|------------|---------------------|----------------------------|------------------------|
| 🔴 As a user, I want the aicr-main area to fill the entire remaining viewport height, so that the layout looks consistent and no empty space appears at the bottom.<br/><br/>**Main Operation Scenarios**:<br/>- 用户在桌面浏览器打开 AICR 页面，主区域应占满视口<br/>- 用户在平板或手机打开页面，主区域应自适应屏幕高度<br/>- 当文件树或代码内容超出可视区域时，应出现滚动条 | 1. `aicr-main` 高度等于 `100vh - header-height`<br/>2. 内容超出时出现滚动条而非截断<br/>3. 响应式断点（950px、640px）下行为保持一致 | [Requirement Tasks](./02_requirement-tasks.md)<br/>[Design Document](./03_design-document.md)<br/>[Project Report](./07_project-report.md) | [Generate Document Skill](../../.claude/skills/generate-document/SKILL.md)<br/>[Requirement Document Specification](../../.claude/skills/generate-document/rules/requirement-document.md)<br/>[Requirement Document Template](../../.claude/skills/generate-document/templates/requirement-document.md)<br/>[Requirement Document Checklist](../../.claude/skills/generate-document/checklists/requirement-document.md) |

## Document Specifications

- 本文档对应用户故事：🔴 `aicr-main` 自适应整个屏幕高度，超出部分使用滚动条显示
- 变更范围：仅限 `src/views/aicr/components/aicrPage/index.css` 和 `src/views/aicr/styles/index.css` 中 `.aicr-main` 相关样式
- 不涉及功能逻辑、API、状态管理变更

## Acceptance Criteria

**P0**:
- `aicr-main` 在任何视口高度下均占满可用空间（`100vh - header`）
- 当 `aicr-main` 内部内容总高度超过其自身高度时，显示纵向滚动条
- 现有子区域滚动（sidebar、code-area）不受影响

**P1**:
- 响应式布局（max-width: 950px / 640px）下行为保持一致
- 无视觉回归（背景色、边框、阴影保持原样）

**P2**:
- 滚动条样式与现有设计系统一致

## Feature Details

### 自适应视口高度

- **描述**: `aicr-main` 需要精确计算并占满视口剩余高度。当前 `#app` 使用 `min-height: 100vh`，当内容不足时页面高度可能小于视口高度，导致底部出现空白。通过确保 `aicr-main` 及其父级链正确设置 `height: 100%` 或使用 `flex` 布局占满空间，可消除此问题。
- **边界与例外**: 在极小屏幕（< 320px）下，布局保持最小宽度限制，不强制拉伸。
- **价值/动机**: 消除底部空白，提升视觉一致性；确保内容区域始终可用。

### 滚动条支持

- **描述**: 当前 `.aicr-main` 设置 `overflow: hidden`，任何超出其边界的内容都会被截断。将其改为 `overflow: auto`（或确保子元素滚动容器正常工作）可让用户通过滚动访问被截断的内容。
- **边界与例外**: 子区域（sidebar、code-area）已有独立滚动容器，本变更不替代子区域滚动，而是作为兜底机制。
- **价值/动机**: 防止内容截断，提升可访问性。

## Usage Scenario Examples

📋 **Scenario 1: 桌面端正常浏览**
- **Background**: 用户在 1920x1080 桌面浏览器打开 AICR 页面。
- **Operation**: 页面加载后观察主区域高度。
- **Result**: `aicr-main` 占满 header 下方全部空间，无底部空白。

🎨 **Scenario 2: 小屏幕内容溢出**
- **Background**: 用户在 768px 高度笔记本打开页面，文件树展开大量节点。
- **Operation**: 尝试滚动查看底部文件。
- **Result**: `aicr-main` 出现滚动条，用户可滚动查看全部内容。

📋 **Scenario 3: 移动端适配**
- **Background**: 用户在手机屏幕（375x812）打开页面。
- **Operation**: 页面加载后观察布局。
- **Result**: `aicr-main` 按响应式规则垂直堆叠，高度自适应屏幕，可滚动。

## Postscript: Future Planning & Improvements

- 可考虑使用 `dvh` 单位以更好适配移动浏览器动态工具栏
- 若后续引入底部固定栏，需调整高度计算逻辑
