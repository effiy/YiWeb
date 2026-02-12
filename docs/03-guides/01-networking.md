# YiWeb 网络请求与鉴权

本文描述项目的网络请求分层、鉴权（X-Token）注入方式、以及常见的请求形态（JSON / 流式）。

## 关键概念

- `API_URL`：业务 API 基础地址（会话/文件等）
- `DATA_URL`：数据服务基础地址（例如新闻数据）
- 鉴权方式：请求头 `X-Token`
- 模型选择：默认在请求 payload 的 `model` 字段体现（主要用于流式 Prompt 请求）

配置与全局注入位置：[config.js](../../src/config.js)

## 请求分层（从上到下）

### 1) 页面/业务代码

页面通常从 [services/index.js](../../src/services/index.js) 导入请求能力：

- CRUD：`getData / postData / updateData / patchData / deleteData`
- 流式：`streamPrompt / streamPromptJSON`

对应实现集中在：[crud.js](../../src/services/modules/crud.js)

### 2) RequestClient（统一 fetch 封装）

`RequestClient` 负责通用的 JSON 请求封装、超时、Abort、以及请求/响应日志。

- 实现：[requestHelper.js](../../src/services/helper/requestHelper.js)
- 默认行为：
  - `mode: 'cors'`
  - `credentials: 'omit'`
  - `timeout`：默认 5 分钟
  - 默认 `Content-Type: application/json`、`Accept: application/json`

该模块会在浏览器全局暴露 `window.requestClient`、`window.getRequest` 等能力（供非模块环境兼容）。

### 3) 鉴权（X-Token）

- Token 存储与读取：[authUtils.js](../../src/services/helper/authUtils.js)
  - localStorage key：`YiWeb.apiToken.v1`
  - 请求头注入：`getAuthHeaders()` → `{ 'X-Token': token }`
- 注入点：`requestHelper.js` 的请求拦截器会在发送前自动合并 `X-Token`

401 处理：

- 处理逻辑：[authErrorHandler.js](../../src/services/helper/authErrorHandler.js)
- 常见行为：提示重新登录、可选自动清除 token、可配置提示方式

## 常见请求形态

### 1) 普通 JSON 请求（CRUD）

对应 `crud.js` 的 `getData/postData/...`：

- 内部调用 `window.requestClient.get/post/...`
- `getData` 支持简单内存缓存（按 URL 作为 key）
- `post/put/patch/delete` 成功后会清空缓存

你可以在页面代码中自行拼 URL：

- 直接使用 `window.API_URL` / `window.DATA_URL`
- 或使用 `src/config.js` 暴露的 `buildApiUrl()` / `buildDataUrl()`

### 2) 流式请求（Prompt / SSE）

对应 `crud.js` 的 `streamPrompt()`：

- 使用原生 `fetch(url, { method: 'POST', headers, body })`
- `Accept` 为 `text/event-stream,application/json`
- 会自动注入 `X-Token`
- 会自动补齐 `model`（若请求 payload 未显式指定）
- 对 401 会走统一处理器
- 对 422 会做一次回退重试（尽量去掉可选字段，如 `model`）

支持的 payload 结构（`crud.js` 内部兼容多版本协议）：

- 服务调用结构：包含 `module_name` / `method_name`（会尽量为 AI 类调用补齐 `parameters.model`）
- 新结构：包含 `type` 字段（会做少量兼容处理）
- 旧结构：`{ fromSystem, fromUser, model?, images? }`

## 调试与排查

- 开启 debug：URL 加 `?debug=true` 或 `localStorage.setItem('debug','true')` 后刷新
- 观察请求日志：`requestHelper.js` 会记录“发送请求/收到响应”的 URL、状态码、耗时
- 401：先确认 localStorage 里是否存在 `YiWeb.apiToken.v1`，再重试请求
- CORS：确认 API 服务端允许 `http://localhost:<port>` 的跨域访问

