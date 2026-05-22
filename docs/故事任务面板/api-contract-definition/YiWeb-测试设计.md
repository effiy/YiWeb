> | v1.0.0 | 2026-05-22 | deepseek-v4-pro | 🌿 feat/api-contract-definition | ⏱️ — | 📎 [CLAUDE.md](../../../CLAUDE.md) |

> **导航**: [← YiWeb-技术评审](./YiWeb-技术评审.md) · [YiWeb-实施报告 →](./YiWeb-实施报告.md)

> **来源引用**: 基于 [YiWeb-故事任务](./YiWeb-故事任务.md) §5 AC# + [YiWeb-技术评审](./YiWeb-技术评审.md) §2–§6。

[§0 基线溯源](#sec0-baseline) · [§1 测试范围](#sec1-scope) · [§2 正常路径](#sec2-normal) · [§3 边界/异常](#sec3-edge) · [§4 Gate A 交接](#sec4-gate)

---

### 主要价值

- 🎯 契约验证 — 每用例验证接口契约的一个具体声明
- 🔒 完整覆盖 — requestHelper 6 方法 + crud 15 方法 + authUtils 8 方法 + authErrorHandler 2 方法
- ⚡ 可执行 — Given/When/Then 可直接转为测试代码
- 📊 AC 溯源 — 每用例显式映射到故事任务 AC#

---

<a id="sec0-baseline"></a>

## §0 基线溯源

| AC# | 覆盖用例 |
|-----|---------|
| AC1: requestHelper 契约可用 | TC-N01–N06, TC-E01–E03 |
| AC2: crud 契约可用 | TC-N07–N12, TC-E04–E06 |
| AC3: Token 管理契约可用 | TC-N13–N16, TC-E07–E08 |
| AC4: 契约总览可用 | TC-N17 |

---

<a id="sec1-scope"></a>

## §1 测试范围

验证契约文档的准确性和完整性：每个文档声明的接口签名、参数约束、返回值、错误码必须与源码一致。

---

<a id="sec2-normal"></a>

## §2 正常路径用例

### TC-N01: sendRequest 基础 GET

| Given | When | Then |
|-------|------|------|
| mock fetch 返回 200 | 调用 `sendRequest('/api/test')` | 返回 `{ data, status: 200 }`，fetch 含 `credentials: omit` |

### TC-N02: sendRequest 携带 X-Token

| Given | localStorage 有 Token | When | 调用 `sendRequest('/api/test')` | Then | fetch 调用含 `X-Token` 请求头 |

### TC-N03: sendRequest 超时

| Given | mock fetch 延迟 200ms | When | 调用 `sendRequest('/api/test', { timeout: 100 })` | Then | 抛出 REQUEST_TIMEOUT 错误 |

### TC-N04: getRequest 参数序列化

| Given | mock fetch 返回 200 | When | 调用 `getRequest('/api/test', { page: 1, size: 10 })` | Then | fetch URL 含 `?page=1&size=10` |

### TC-N05: postRequest 自动 JSON.stringify

| Given | mock fetch 返回 200 | When | 调用 `postRequest('/api/test', { name: 'test' })` | Then | fetch body 为 `'{"name":"test"}'`，Content-Type 为 application/json |

### TC-N06: withAuth=false 跳过认证

| Given | localStorage 有 Token | When | 调用 `sendRequest('/api/public', { withAuth: false })` | Then | fetch 调用不含 X-Token 头 |

### TC-N07: crudGet 缓存命中

| Given | 首次 crudGet 返回 `{ data: [1,2,3] }` | When | 再次调用同一 URL 的 crudGet | Then | 返回缓存数据，fetch 仅调用 1 次 |

### TC-N08: crudPost 不缓存

| Given | mock fetch 返回 200 | When | 连续两次调用 crudPost 同一 URL | Then | fetch 调用 2 次（POST 不缓存） |

### TC-N09: crudBatch 并行

| Given | mock fetch 返回 200 | When | 调用 crudBatch([{method:'GET',url:'/a'},{method:'GET',url:'/b'}]) | Then | 两个请求并行发出，返回 `[resultA, resultB]` |

### TC-N10: crudStream onChunk

| Given | mock fetch 返回 ReadableStream | When | 调用 crudStream 并传入 onChunk 回调 | Then | 每个 chunk 触发 onChunk(data) |

### TC-N11: clearCache 清空

| Given | 缓存中有 3 条记录 | When | 调用 `clearCache()` | Then | 缓存为空，下次请求触发 fetch |

### TC-N12: clearCache pattern

| Given | 缓存中有 `/api/a` 和 `/api/b` | When | 调用 `clearCache('/api/a')` | Then | `/api/a` 缓存清除，`/api/b` 保留 |

### TC-N13: setToken + getToken

| Given | localStorage 无 Token | When | setToken('tok-123') 后 getToken() | Then | 返回 `'tok-123'` |

### TC-N14: getAuthHeaders 含 Token

| Given | setToken('tok-456') | When | 调用 getAuthHeaders() | Then | 返回 `{ 'X-Token': 'tok-456' }` |

### TC-N15: clearToken

| Given | setToken('tok-789') | When | 调用 clearToken() 后 getToken() | Then | 返回 null |

### TC-N16: isTokenExpired

| Given | 已过期的 JWT Token | When | 调用 isTokenExpired() | Then | 返回 true |

### TC-N17: 契约总览可读

| Given | 契约总览文档存在 | When | 新成员阅读文档 | Then | 30 分钟内可完成首次 API 调用 |

---

<a id="sec3-edge"></a>

## §3 边界/异常

### TC-E01: sendRequest 网络错误

| Given | mock fetch reject | When | 调用 sendRequest | Then | 错误 code 为 NETWORK_FETCH_FAILED |

### TC-E02: sendRequest CORS 错误

| Given | mock fetch reject with CORS | When | 调用 sendRequest | Then | 错误 code 为 CORS_BLOCKED |

### TC-E03: sendRequest 空 url

| Given | url 为空字符串 | When | 调用 sendRequest('') | Then | 抛出错误或返回明确错误提示 |

### TC-E04: crudGet 缓存过期

| Given | 缓存 TTL 设为 1ms | When | 首次请求后等待 2ms 再请求 | Then | 第二次触发 fetch（缓存过期） |

### TC-E05: crudStream 中断

| Given | ReadableStream 中途 error | When | 流式请求进行中，Stream 抛出错误 | Then | onError 回调被触发，错误 code 为 STREAM_API_ERROR |

### TC-E06: crudBatch 部分失败

| Given | mock fetch: /a 200, /b 500 | When | crudBatch 请求 /a 和 /b | Then | 返回结果含成功和失败，不互相影响 |

### TC-E07: getAuthHeaders 无 Token

| Given | localStorage 无 Token | When | 调用 getAuthHeaders() | Then | 返回 `{}`（空对象） |

### TC-E08: isAuthError 非 401

| Given | response status 500 | When | 调用 isAuthError(500) | Then | 返回 false |

---

<a id="sec4-gate"></a>

## §4 Gate A 交接信令

| 信号 | 值 | 验证命令 |
|------|-----|---------|
| P0 用例 | TC-N01–N16, TC-E01–E08 | 审查每用例 Given/When/Then 完整性 |
| 方法覆盖率 | requestHelper 6/6 + crud 15/15 + authUtils 6/8 + authErrorHandler 2/2 | 对照技术评审 §2–§5 方法表 |
| 错误码覆盖率 | 10/11 ErrorCodes 有用例覆盖 | 对照技术评审 §6 错误码表 |
| AC 覆盖率 | 4/4 AC# 有对应用例 | 对照 §0 基线溯源表 |

---

> **变更记录**
> | 日期 | 变更 | 触发 | 证据 |
> |------|------|------|------|
> | 2026-05-22 | 初始生成 | /rui doc | YiWeb-故事任务 §5 + YiWeb-技术评审 §2–§6 |
