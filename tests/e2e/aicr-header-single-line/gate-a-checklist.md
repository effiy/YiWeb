# Gate A: AICR Header Single Line - 编码前验证清单

> **验证时间**: 2026-04-30
> **验证环境**: 本地 Python http.server:9000, Playwright Chromium 1280x800
> **分支**: feat/aicr-header-single-line

## 主路径 MVP 验证

### 1. 页面可加载
- [x] AICR 入口页 `http://localhost:9000/src/views/aicr/index.html` 返回 HTTP 200
- [x] Vue 组件注册完成（控制台确认 AicrHeader, SearchHeader 等已注册）
- [x] SearchHeader 成功渲染于页面顶部

### 2. 当前布局基线
- [x] 桌面端 1280px 下 SearchHeader 独占整行显示
- [x] `.aicr-header` 类元素在 DOM 中不存在（AicrHeader 组件为 Fragment 多根渲染）
- [x] `session-list-tags` 因 API 401 未授权导致 `allTags` 为空，未渲染（符合预期，非布局问题）
- [x] `.header-row` 计算样式确认为 `display: grid`（SearchHeader 原始 Grid 布局）

### 3. 关键发现（影响实施策略）
- **发现 1**: `aicrHeader/index.html` 模板无根元素包裹，导致 `.aicr-header` CSS 选择器全部失效
- **发现 2**: `styles/index.css` 中 `.aicr-main` 的 `height: calc(100vh - 56px)` 会覆盖 `aicrPage/index.css` 的同名规则
- **发现 3**: 本地环境因认证限制无法获取会话数据，标签区域需依赖代码逻辑验证，无法通过浏览器实测拖拽与标签流式布局

### 4. 证据文件
- 截图基线: `tests/screenshots/aicr-header-single-line/gate-a/desktop-before.png`

### 5. 结论
方案在当前仓库环境下可实施，但需补充 `aicrHeader/index.html` 根元素包裹（超出设计文档 4 文件范围，由代码事实推导）。标签区域的完整交互验证需在具备认证的环境中进行。
