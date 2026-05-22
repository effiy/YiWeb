> | v1.0.0 | 2026-05-22 | deepseek-v4-pro | 🌿 feat/services | ⏱️ — | 📎 [CLAUDE.md](../../../CLAUDE.md) |

> **导航**: [← YiWeb-技术评审](./YiWeb-技术评审.md) · [YiWeb-实施报告 →](./YiWeb-实施报告.md)

> **来源引用**: 基于 [YiWeb-技术评审](./YiWeb-技术评审.md) §1–§3 + 源码安全扫描。

> **独立审计标记**: 本审计由 security agent 独立执行。

---

### 主要价值

- 🎯 服务层是安全的关键控制点 — 所有 API 调用经此出口
- 🔒 纵深防御 — credentials:'omit' + X-Token + HTTPS 三层防护
- ⚡ STRIDE 全覆盖 — 六类威胁逐一建模
- 📊 合规 6 项全查

---

## §1 STRIDE 威胁建模

### S — Spoofing | T — Tampering

| 威胁 | 缓解 |
|------|------|
| 伪造请求来源 | X-Token 由服务端签发，客户端不可伪造 |
| 篡改请求体 | HTTPS 传输加密 |
| 篡改缓存数据 | 内存 Map 不可外部访问 |

### R — Repudiation

| 威胁 | 缓解 |
|------|------|
| API 调用不可追溯 | 每条请求含 X-Token，服务端可审计 |

### I — Information Disclosure

| 威胁 | 缓解 |
|------|------|
| Token 通过 URL 泄漏 | Token 仅通过 X-Token 请求头传递 |
| 错误响应含敏感信息 | ErrorCodes 统一格式，不暴露后端堆栈 |
| 缓存含敏感数据 | 页面关闭时内存自动释放，clearCache 提供手动清除 |

### D — Denial of Service

| 威胁 | 缓解 |
|------|------|
| 缓存无限增长 | 100 条目上限 + 5 分钟 TTL |
| 请求无限挂起 | 5 分钟默认超时 + AbortController |

### E — Elevation of Privilege

| 威胁 | 缓解 |
|------|------|
| withAuth=false 绕过认证 | 仅公开接口使用，后端仍需验证 |
| window 全局方法被覆盖 | 关键操作经服务端二次验证 |

---

## §2 安全控制汇总

| 控制 | 实现 | 位置 |
|------|------|------|
| Cookie 隔离 | `credentials: 'omit'` | requestHelper.js:31 |
| Token 认证 | `X-Token` 请求头 | authUtils.js |
| HTTP 加密 | prod 环境 `https://` | config.js |
| 缓存限制 | maxSize: 100, TTL: 5min | crud.js:31–34 |
| 超时保护 | timeout: 5min | requestHelper.js:23 |
| 错误脱敏 | ErrorCodes 统一格式 | error.js |

---

## §3 合规检查

| 检查项 | 状态 | 说明 |
|------|:--:|------|
| 依赖许可证 | N/A | 无外部依赖 |
| 个人数据处理 | ⚠️ | Token 存于 localStorage |
| 凭证管理 | ✅ | Token 不写入 Cookie/URL |
| 日志保留 | ⚠️ | window.logInfo 输出到控制台 |
| 第三方审计 | N/A | — |
| 安全更新 | N/A | — |

---

> **变更记录**
> | 日期 | 变更 | 触发 | 证据 |
> |------|------|------|------|
> | 2026-05-22 | 初始审计 — 独立执行 | /rui doc --from-code services security agent | src/core/services/ 源码 |
