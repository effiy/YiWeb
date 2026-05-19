> | v1.0 | 2026-05-19 | deepseek-v4-pro | 🌿 main | 📎 [../YiWeb-01-故事任务.md](./YiWeb-01-故事任务.md) |

> **来源引用**: 上游 01-故事任务 §5 验收标准 AC1–AC8、§3 成功标准 SC1–SC6。

---

## §1 测试范围

| 维度 | 范围 |
|------|------|
| 测试对象 | `clearCacheAndRefresh()` 函数及关联的 `hardReload()` 函数 |
| 测试类型 | 手动验证（浏览器 DevTools） |
| 涉及浏览器 API | localStorage、sessionStorage、CacheStorage、IndexedDB、Service Worker、`window.location.replace` |

---

## §2 手动测试用例

### TC1: 确认弹窗 — 取消操作

| 项目 | 内容 |
|------|------|
| 关联 AC | AC8 |
| 前置条件 | 页面已加载，浏览器中有缓存数据 |
| 步骤 | 1. 打开浏览器 DevTools → Application 面板<br>2. 记录当前 localStorage 键列表和值<br>3. 点击页面头部「清缓存并刷新」按钮<br>4. 在确认弹窗中点击「取消」 |
| 预期结果 | 弹窗关闭，页面不刷新，localStorage / sessionStorage / CacheStorage / IndexedDB 内容与操作前完全一致 |
| 优先级 | P0 |

### TC2: Token 保留验证

| 项目 | 内容 |
|------|------|
| 关联 AC | AC2 |
| 前置条件 | 页面已登录，`localStorage['YiWeb.apiToken.v1']` 有值 |
| 步骤 | 1. 记录 `localStorage['YiWeb.apiToken.v1']` 和 `localStorage['YiWeb.apiModel.v1']` 的值<br>2. 点击「清缓存并刷新」→ 确认<br>3. 页面重载后打开 DevTools → Application → Local Storage |
| 预期结果 | `YiWeb.apiToken.v1` 和 `YiWeb.apiModel.v1` 的值与刷新前完全一致 |
| 优先级 | P0 |

### TC3: 其他 localStorage 数据清除

| 项目 | 内容 |
|------|------|
| 关联 AC | AC2 |
| 前置条件 | localStorage 中有非 Token 键（如搜索历史、UI 偏好等） |
| 步骤 | 1. 在 Application 面板确认存在非 Token 的 localStorage 键<br>2. 点击「清缓存并刷新」→ 确认<br>3. 页面重载后检查 localStorage |
| 预期结果 | 除 `YiWeb.apiToken.v1` 和 `YiWeb.apiModel.v1` 外，其他所有键被移除 |
| 优先级 | P0 |

### TC4: sessionStorage 全部清除

| 项目 | 内容 |
|------|------|
| 关联 AC | AC3 |
| 前置条件 | sessionStorage 中有数据（正常使用页面后自动产生） |
| 步骤 | 1. 在 Application → Session Storage 确认有数据<br>2. 点击「清缓存并刷新」→ 确认<br>3. 页面重载后检查 Session Storage |
| 预期结果 | sessionStorage 完全为空 |
| 优先级 | P0 |

### TC5: CacheStorage 全部清除

| 项目 | 内容 |
|------|------|
| 关联 AC | AC4 |
| 前置条件 | 页面已加载，CacheStorage 中有 Service Worker 缓存的静态资源 |
| 步骤 | 1. 在 Application → Cache Storage 确认有缓存条目<br>2. 点击「清缓存并刷新」→ 确认<br>3. 页面重载后检查 Cache Storage |
| 预期结果 | Cache Storage 中所有缓存空间被删除，列表为空 |
| 优先级 | P0 |

### TC6: IndexedDB 全部清除

| 项目 | 内容 |
|------|------|
| 关联 AC | AC5 |
| 前置条件 | 页面使用过 IndexedDB（如有离线数据功能则数据更多） |
| 步骤 | 1. 在 Application → IndexedDB 确认有数据库<br>2. 点击「清缓存并刷新」→ 确认<br>3. 页面重载后检查 IndexedDB |
| 预期结果 | IndexedDB 中所有数据库被删除，列表为空 |
| 优先级 | P0 |

### TC7: Service Worker 全部注销

| 项目 | 内容 |
|------|------|
| 关联 AC | AC6 |
| 前置条件 | Service Worker 已注册（如项目使用了 SW 缓存策略） |
| 步骤 | 1. 在 Application → Service Workers 确认有注册<br>2. 点击「清缓存并刷新」→ 确认<br>3. 页面重载后检查 Service Workers |
| 预期结果 | 所有 Service Worker 注册被移除 |
| 优先级 | P0 |

### TC8: HTTP 缓存绕过（硬刷新验证）

| 项目 | 内容 |
|------|------|
| 关联 AC | AC7 |
| 前置条件 | 页面非首次加载（HTTP 磁盘缓存中有静态资源） |
| 步骤 | 1. 打开 DevTools → Network 面板，勾选「Disable cache」（仅用于验证对比）<br>2. 取消勾选「Disable cache」<br>3. 正常刷新页面一次，观察 Network Size 列（应有 `(disk cache)` 标记）<br>4. 点击「清缓存并刷新」→ 确认<br>5. 页面重载后观察 Network Size 列 |
| 预期结果 | 所有静态资源请求的 Size 列显示实际文件大小（非 `(disk cache)` 或 `(memory cache)`），表明从服务器重新拉取<br>URL 地址栏包含 `?_t=<timestamp>` 参数 |
| 优先级 | P0 |

### TC9: URL 无历史污染

| 项目 | 内容 |
|------|------|
| 关联 AC | AC7 |
| 前置条件 | 页面已加载 |
| 步骤 | 1. 点击「清缓存并刷新」→ 确认<br>2. 页面重载后点击浏览器「后退」按钮 |
| 预期结果 | 「后退」按钮不会回到带 `_t` 参数的旧 URL，而是回到刷新前浏览的上一页 |
| 优先级 | P1 |

---

## §3 异常场景测试

### TC10: 无 CacheStorage 支持

| 项目 | 内容 |
|------|------|
| 前置条件 | 在不支持 CacheStorage API 的浏览器中（或模拟禁用） |
| 步骤 | 点击「清缓存并刷新」→ 确认 |
| 预期结果 | 静默跳过 CacheStorage 清理，其他清理步骤正常执行，最终硬刷新成功 |
| 优先级 | P1 |

### TC11: 无 Service Worker 注册

| 项目 | 内容 |
|------|------|
| 前置条件 | 页面无 Service Worker 注册（如首次访问或 SW 已被注销） |
| 步骤 | 点击「清缓存并刷新」→ 确认 |
| 预期结果 | 静默跳过 SW 注销步骤，其他清理正常执行，硬刷新成功 |
| 优先级 | P1 |

### TC12: 连续快速点击

| 项目 | 内容 |
|------|------|
| 前置条件 | 页面已加载 |
| 步骤 | 快速连续点击两次「清缓存并刷新」按钮 |
| 预期结果 | 第一次点击后弹出确认弹窗；第二次点击时弹窗已覆盖（`window.confirm` 模态），不会触发两个清理流程 |
| 优先级 | P2 |

---

## §4 回归检查

| ID | 检查项 | 关联模块 |
|----|--------|---------|
| RG1 | 环境切换功能正常（env badge 点击切换 local/prod 后仍正常重载） | config.js |
| RG2 | API 模型列表刷新功能不受影响 | AiModelSelector |
| RG3 | 故事面板刷新功能不受影响 | storyPanel |
| RG4 | FAQ 列表刷新功能不受影响 | aicrModals |
| RG5 | 用户登录状态在刷新后保持有效 | authUtils |
