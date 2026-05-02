# 网络请求约定

## HTTP 层架构

本项目使用两层 HTTP 抽象：

```
业务代码
    │
    ├──→ src/core/services/     (业务服务层)
    │         │
    │         └──→ cdn/utils/core/api.js   (API 客户端)
    │                   │
    │                   └──→ cdn/utils/core/http.js   (底层 HTTP)
    │                             │
    │                             └──→ fetch()
    │
    └──→ cdn/utils/core/http.js  (直接使用，简单场景)
```

## 底层 HTTP（http.js）

提供基于 `fetch` 的 HTTP 工具，支持拦截器：

```javascript
// 添加拦截器
addRequestInterceptor((config) => {
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
});

addResponseInterceptor((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
});

// 发起请求
const data = await get('/api/sessions');
const result = await post('/api/sessions', { name: 'new' });
```

## API 客户端（api.js）

提供面向对象的 `ApiClient` 类：

```javascript
const client = new ApiClient({
    baseURL: 'https://api.example.com',
    timeout: 30000,
    headers: { 'X-Custom': 'value' }
});

client.addRequestInterceptor((config) => config);
client.addResponseInterceptor((response) => response);
client.addErrorInterceptor((error) => handleError(error));

const data = await client.get('/sessions');
```

## 业务服务层（src/core/services/）

封装具体业务 API：

```javascript
// src/core/services/index.js
export const getData = (path, options) => http.get(buildApiUrl(path), options);
export const postData = (path, data, options) => http.post(buildApiUrl(path), data, options);
export const batchOperations = (operations) => Promise.all(operations);
```

## 端点配置

环境端点定义在 `src/core/config.js`：

| 环境 | DATA_URL | API_URL | OLLAMA_URL |
|------|----------|---------|------------|
| local | http://localhost:9000 | http://localhost:8000 | http://localhost:11434 |
| prod | https://data.effiy.cn | https://api.effiy.cn | https://ollama.effiy.cn |

## 环境切换

```javascript
// URL 参数
?env=local

// localStorage
localStorage.setItem('env', 'local');
location.reload();

// JS API
window.setEnv('local');
```

## 错误处理

网络错误统一通过 `cdn/utils/core/error.js` 处理：

| 错误码 | 场景 |
|--------|------|
| `NETWORK_FETCH_FAILED` | fetch 失败 |
| `REQUEST_TIMEOUT` | 请求超时 |
| `CORS_BLOCKED` | CORS 被阻止 |
| `HTTP_ERROR` | HTTP 非 2xx |
| `STREAM_API_ERROR` | 流式 API 错误 |

## 流式请求

AI 聊天使用 SSE/流式响应：

```javascript
const response = await fetch(url, { ... });
const reader = response.body.getReader();
// 逐块读取并渲染
```

## Postscript: Future Planning & Improvements

- 考虑添加请求重试机制
- 评估是否需要请求去重（debounce/dedup）
- 添加请求/响应日志开关（debug 模式）
