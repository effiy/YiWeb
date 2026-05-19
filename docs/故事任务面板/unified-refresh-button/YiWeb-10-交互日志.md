# YiWeb-10-交互日志

## 执行概要

| 项目 | 值 |
|------|-----|
| 故事 | unified-refresh-button |
| 描述 | 统一刷新按钮操作：强制刷新页面，Delete browsing data，Token保留，清空该域名下的 cached images and files |
| 管线 | doc → code → 交付 |
| 状态 | ✅ 完成 |

## 阶段记录

### doc 阶段 (2026-05-19)

- PM 拆解为 2 个子故事：S1 硬刷新机制升级、S2 刷新按钮行为统一
- Coder 补齐前端技术评审 (04) 和测试用例评审 (05)
- 产出 4 份基线文档

### code 阶段 (2026-05-19)

**S1 — 硬刷新机制升级** ✅
- 提取 `hardReload()` 函数：使用 `new URL()` + `location.replace()` 替代 `location.reload()`
- 缓存爆破参数 `_t` 使用 `Date.now().toString(36)` 生成唯一标识
- 浏览器将带唯一查询参数的 URL 视为全新请求，无法命中 HTTP 磁盘缓存

**S2 — 刷新按钮行为统一** ✅
- SearchHeader「清缓存并刷新」按钮不变（已绑定 `clear-cache` 事件 → `clearCacheAndRefresh`）
- Token 保留逻辑不变：`YiWeb.apiToken.v1` + `YiWeb.apiModel.v1` 白名单

**验收审计** ✅
- 清理序列：localStorage(保留Token) → sessionStorage → CacheStorage → IndexedDB → Service Worker → hardReload
- 异步清理全部 await 完成后再导航，避免竞态

## 变更清单 (1 文件)

### 修改 (1)
- `src/views/aicr/hooks/clearCacheMethods.js`

## 架构决策

- **`location.replace()` 替代 `location.reload()`**：带唯一 `_t` 参数的 URL 导航迫使浏览器绕过 HTTP 磁盘缓存，等同于 Empty Cache and Hard Reload
- **不清理 Cookie**：避免误清可能存在的认证 Cookie，Token 仅存于 localStorage
- **向后兼容**：全局 `window.clearCacheAndRefresh` 保留
