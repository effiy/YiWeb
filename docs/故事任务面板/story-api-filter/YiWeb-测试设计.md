> | v1.0.0 | 2026-05-24 | deepseek-v4-pro | 🌿 feat/story-api-filter | ⏱️ — | 📎 [CLAUDE.md](../../../CLAUDE.md) |

> **导航**: [← YiWeb-技术评审](./YiWeb-技术评审.md) | [YiWeb-安全审计 →](./YiWeb-安全审计.md)

> **来源引用**: [YiWeb-故事任务](./YiWeb-故事任务.md) §5 AC1–AC2 · [YiWeb-使用场景](./YiWeb-使用场景.md) §1 场景 1–3

### 主要价值

- ✅ AC 全覆盖 — 每条验收标准映射到具体测试用例
- 🎯 四类用例 — 正常路径 / 边界条件 / 异常路径 / 回归用例
- 🔗 Gate A 就绪 — P0 用例 ID 明确，验证命令可执行
- 📋 可追溯 — 每用例溯源至故事任务 AC# 和使用场景

---

## §0 基线溯源

| 用例 ID | 溯源 AC# | 溯源场景 |
|---------|---------|---------|
| TC-N-1, TC-N-2 | AC1 | 场景 1: 正常加载 |
| TC-E-1 | AC1 | 场景 2: 空状态 |
| TC-EX-1, TC-EX-2 | AC2 | 场景 3: API 不可用 |
| TC-R-1 | AC1 | 场景 1 |

---

## §1 正常路径用例

### TC-N-1: API 调用包含 filter 参数

| 字段 | 内容 |
|------|------|
| Given | Story 页面已加载，API_URL 已配置，Token 有效 |
| When | `fetchStories()` 被调用 |
| Then | POST 请求体 `parameters.filter` 为 `{ file_path: '故事任务面板/' }` |
| 验证 | Chrome DevTools Network 面板检查请求 Payload |
| 优先级 | P0 |

### TC-N-2: 故事列表正常渲染

| 字段 | 内容 |
|------|------|
| Given | API 返回 故事任务面板/ 目录下的文档列表 |
| When | store.js 处理响应数据 |
| Then | stories.value 非空数组，各故事含 name/status/type/projectTags |
| 验证 | 页面展示故事卡片/表格，数据与远端一致 |
| 优先级 | P0 |

---

## §2 边界条件用例

### TC-E-1: API 返回空列表

| 字段 | 内容 |
|------|------|
| Given | 远端无 故事任务面板/ 前缀的文档 |
| When | `fetchStories()` 执行 |
| Then | stories.value = []，页面显示空状态 |
| 验证 | 页面无故事卡片，显示空状态提示 |
| 优先级 | P1 |

---

## §3 异常路径用例

### TC-EX-1: 网络错误

| 字段 | 内容 |
|------|------|
| Given | 远端 API 不可达（网络断开） |
| When | `fetchStories()` 尝试调用 API |
| Then | catch 块执行，error.value 非空，页面显示错误状态 |
| 验证 | 页面显示错误信息 |
| 优先级 | P1 |

### TC-EX-2: API 不支持 filter（回退安全网）

| 字段 | 内容 |
|------|------|
| Given | API 的 query_documents 忽略 filter 参数，返回全量 sessions |
| When | `fetchStories()` 执行 |
| Then | 客户端 `items.filter(file_path.startsWith('故事任务面板/'))` 安全网生效，功能正常 |
| 验证 | 故事列表展示正确（仅含 故事任务面板 内容） |
| 优先级 | P1 |

---

## §4 回归用例

### TC-R-1: 现有功能不受影响

| 字段 | 内容 |
|------|------|
| Given | 远端 API 正常 |
| When | 用户操作故事面板（筛选/排序/查看详情） |
| Then | 所有现有功能正常：标签筛选、状态筛选、类型筛选、文本搜索、排序、详情弹窗 |
| 验证 | 逐一操作各筛选器和排序选项 |
| 优先级 | P0 |

---

## §5 Gate A 交接

| 信号 | 值 | 说明 |
|------|-----|------|
| P0 用例 ID | TC-N-1, TC-N-2, TC-R-1 | 必须通过的用例 |
| 验证命令 | 浏览器 DevTools Network 面板观察 POST 请求体 | 人工验证 |
| 阻塞条件 | TC-N-1 或 TC-N-2 或 TC-R-1 任一失败 | Gate A 不通过 |

---

> **变更记录**
> | 日期 | 变更 | 触发 | 证据 |
> |------|------|------|------|
> | 2026-05-24 | 初始生成 | /rui story 页面数据来源应为 API + filter | YiWeb-故事任务.md |
