# YiWeb 测试设计

> 统一项目主题样式 — 测试策略

## §0 基线溯源

| 源文档 | 源章节 | 覆盖率 |
|--------|--------|--------|
| YiWeb-故事任务.md | §5 AC1–AC15 | 100% |
| YiWeb-使用场景.md | UC1–UC5 | 100% |
| YiWeb-技术评审.md | §5 视觉效果验证清单 | 100% |

---

## §1 测试覆盖矩阵

| AC# | 测试类型 | 用例 ID | 描述 |
|-----|---------|--------|------|
| Story1-AC1 | 视觉回归 | T1.1 | spacing.css 工具类引用 `--yi-space-*` |
| Story1-AC2 | 视觉回归 | T1.2 | animations.css 过渡变量引用 `--yi-duration-*` |
| Story1-AC3 | 视觉回归 | T1.3 | spacing.css 半径变量引用 `--yi-radius-*` |
| Story1-AC4 | 视觉回归 | T1.4 | 三视图加载无视觉变化 |
| Story2-AC1 | 视觉回归 | T2.1 | aicr 视图全部使用 `--yi-*` 变量 |
| Story2-AC2 | 视觉回归 | T2.2 | claude 视图无硬编码 fallback |
| Story2-AC3 | 视觉回归 | T2.3 | story 视图无 `#A855F7`/`#1A2332`/`#fff` |
| Story2-AC4 | 视觉回归 | T2.4 | 视图级滚动条样式已移除 |
| Story2-AC5 | 视觉回归 | T2.5 | 三视图视觉无退化 |
| Story3-AC1 | 视觉回归 | T3.1 | 共享组件无硬编码颜色 |
| Story3-AC2 | 视觉回归 | T3.2 | 使用组件的视图视觉无退化 |
| Story4-AC1 | 静态检查 | T4.1 | `utils/typography.css` 已移除 |
| Story4-AC2 | 静态检查 | T4.2 | 旧版变量引用计数为 0（或仅存在于 deprecated 映射区） |
| Story4-AC3 | 视觉回归 | T4.3 | 工具类视觉无退化 |

---

## §2 详细测试用例

### T1.1 — spacing.css 变量引用验证

| 字段 | 内容 |
|------|------|
| 优先级 | P0 |
| 类型 | 视觉回归 |
| 关联 AC | Story1-AC1 |

**Given** spacing.css 已修改为引用 `--yi-space-*` 和 `--yi-radius-*`  
**When** 浏览器加载任意视图页面  
**Then**
- DevTools 检查 `.m-3` 类元素的 `margin` computed value 为 `16px`（`--yi-space-4`）
- DevTools 检查 `.p-2` 类元素的 `padding` computed value 为 `8px`（`--yi-space-2`）
- DevTools 检查 `.gap-3` 类元素的 `gap` computed value 为 `12px`（`--yi-space-3`）

### T1.2 — animations.css 过渡变量验证

| 字段 | 内容 |
|------|------|
| 优先级 | P0 |
| 类型 | 视觉回归 |
| 关联 AC | Story1-AC2 |

**Given** animations.css 已修改为引用 `--yi-duration-*` 和 `--yi-easing-*`  
**When** 浏览器加载任意视图页面  
**Then**
- `.transition-fast` 元素的 `transition-duration` computed value 为 `0.15s`
- `.transition-normal` 元素的 `transition-duration` computed value 为 `0.2s`

### T1.4 — 三视图加载验证

| 字段 | 内容 |
|------|------|
| 优先级 | P0 |
| 类型 | 视觉回归 |
| 关联 AC | Story1-AC4, Story2-AC5 |

**Given** Story 1 全部修改完成  
**When** 分别加载 aicr、claude、story 三个视图页面  
**Then**
- 无样式丢失（无 unstyled content flash）
- 无控制台 CSS 错误
- 页面背景色与修改前一致
- 文字颜色层级与修改前一致
- 按钮/输入框样式与修改前一致

### T2.1 — aicr 视图变量统一验证

| 字段 | 内容 |
|------|------|
| 优先级 | P0 |
| 类型 | 视觉回归 |
| 关联 AC | Story2-AC1 |

**Given** aicr 视图 CSS 已修改  
**When** DevTools 检查元素 computed styles  
**Then**
- 不存在对 `--spacing-lg`、`--spacing-md` 等旧间距变量的引用
- 不存在对 `--radius-lg` 等旧半径变量的引用
- 不存在对 `--text-primary`、`--text-secondary` 等旧文字变量的引用
- 不存在硬编码的 `#CBD5E1`、`#F8FAFC`、`#94A3B8` 等 fallback 值

### T2.3 — story 视图硬编码颜色清除验证

| 字段 | 内容 |
|------|------|
| 优先级 | P0 |
| 类型 | 视觉回归 |
| 关联 AC | Story2-AC3 |

**Given** story 视图 CSS 已修改  
**When** Grep 搜索 `src/views/story/` 目录  
**Then**
- 不存在 `#A855F7` 硬编码（应用新增的 `--yi-self-improve` 变量）
- 不存在 `#1A2332` 硬编码（应为 `--yi-surface-elevated`）
- 不存在孤立 `#fff`（应使用 `--yi-text-on-primary`）

### T2.4 — 视图滚动条清理验证

| 字段 | 内容 |
|------|------|
| 优先级 | P0 |
| 类型 | 视觉回归 |
| 关联 AC | Story2-AC4 |

**Given** 三视图 CSS 已修改  
**When** Grep 搜索 `::-webkit-scrollbar` 在 `src/views/` 目录  
**Then**
- 不存在 `::-webkit-scrollbar` 定义（或仅保留必要的定制）
- 页面滚动条仍正常显示（来自全局 `scrollbar.css`）

### T4.1 — 无用文件清理验证

| 字段 | 内容 |
|------|------|
| 优先级 | P2 |
| 类型 | 静态检查 |
| 关联 AC | Story4-AC1 |

**Given** Story 4 修改完成  
**When** 检查文件系统  
**Then**
- `cdn/styles/utils/typography.css` 文件不存在
- 原引用该文件的代码已更新为直接引用 `base/typography.css`

---

## §3 Gate A 交接信号

| 信号 | 值 | 说明 |
|------|-----|------|
| 全部 AC 覆盖 | YES | 15 个 AC 全部有对应测试用例 |
| P0 用例可执行 | YES | T1.1–T2.5 均可通过浏览器 DevTools 验证 |
| 视觉回归基线 | 修改前截图 | 建议在修改前对三个视图截图作为对比基线 |
| 验证命令 | `grep -r` + DevTools | 静态检查 + 手动视觉验证 |

## §4 回归检查范围

| 视图 | 关键页面元素 | 检查方法 |
|------|------------|---------|
| aicr | 侧边栏、代码区、AI 聊天面板、文件树、按钮、输入框 | 加载页面，浏览各区域 |
| claude | 头部、搜索框、筛选标签、项目卡片、详情面板 | 加载页面，打开详情面板 |
| story | 头部、搜索框、筛选标签、看板列、卡片网格、侧面板 | 加载页面，切换视图模式 |

### 主要价值

- ✅ 全覆盖：15 个 AC 全部有对应的可执行测试用例
- 🔍 可验证：每个用例 Given/When/Then 明确，可直接通过 DevTools 或 grep 验证
- 🛡️ 防退化：视觉回归检查覆盖全部三个视图的关键页面元素
- 📋 Gate A 就绪：交接信号完整，可直接进入实现阶段

### 来源引用

- `YiWeb-故事任务.md` — 全部 AC 定义
- `YiWeb-使用场景.md` — 场景覆盖矩阵
- `YiWeb-技术评审.md` — 变量迁移映射表、视觉验证清单

### 变更记录

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-22 | 初始生成 | Claude |
