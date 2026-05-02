# 安全策略

## 输入安全

### URL 消毒

`cdn/markdown/index.js` 提供 `sanitizeUrl` 函数，限制危险协议：

```javascript
sanitizeUrl(href) // 过滤 javascript:, data: 等危险协议
```

### HTML 转义

`escapeHtml` 函数防止 XSS：

```javascript
escapeHtml(userInput) // 将 <, >, &, ", ' 转为实体
```

### Markdown 消毒

`SanitizePlugin` 在 Markdown 渲染过程中清理危险内容。

## 内容安全

### 外部资源

- 所有 CDN 资源使用 `crossorigin="anonymous"`
- 仅加载可信 CDN（jsDelivr、cdnjs）

### 环境隔离

```javascript
// local 环境与 prod 环境使用不同的 API 端点
local:  http://localhost:8000
prod:   https://api.effiy.cn
```

## 代码规范

- 禁止使用 `eval()` 和 `new Function()`
- 禁止在组件中硬编码敏感配置
- 用户输入必须经过验证和消毒

## 依赖安全

外部依赖通过 CDN 加载，建议：
- 固定版本号（已实施）
- 使用 SRI（Subresource Integrity）校验（待补充）

## Postscript: Future Planning & Improvements

- 为 CDN 资源添加 SRI 校验
- 添加 CSP（Content Security Policy）头部
- 定期进行依赖安全审计
