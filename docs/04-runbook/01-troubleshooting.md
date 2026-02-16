# YiWeb 调试与故障排查

本文按“现象 → 可能原因 → 排查路径”的方式整理常见问题。

## 页面打不开/空白

可能原因：

- 使用 `file://` 直接打开页面，导致模块加载受限
- 静态服务器路径不对，导致资源 404
- CDN 资源加载失败（Vue/marked/mermaid）

排查路径：

- 用静态服务器访问（例如 `python3 -m http.server 5174`）
- 打开 DevTools → Network：
  - 过滤 `status != 200`，优先看 404/blocked
  - 重点检查 `src/views/**/index.js`、组件 `index.js`、组件 `index.html` 是否能加载
- 打开 DevTools → Console：查看首个报错堆栈

## 组件加载超时（组件加载超时: ...）

可能原因：

- 页面 `componentModules` 未包含该组件的模块路径
- 组件模块路径写错导致 404
- 组件模块执行失败（语法错误/运行时错误），从而未写入 `window[ComponentName]`
- 组件 `name` 与页面 `components` 列表不一致

排查路径：

- Network 检查 `componentModules` 中的模块是否 200
- Console 查看组件模块是否报错
- 检查页面 `src/views/**/index.js` 中 `components` 与 `componentModules` 是否一一对应

## 接口 401 / 未授权

可能原因：

- 未设置 `X-Token`
- Token 过期/无效

排查路径：

- 通过页面顶部“钥匙”按钮设置 `X-Token`
- Application → Local Storage 检查 `YiWeb.apiToken.v1`
- Network 中确认请求头是否带 `X-Token`
- 401 的统一处理位置：[authErrorHandler.js](../../src/services/helper/authErrorHandler.js)

## 跨域/CORS 报错

可能原因：

- API 服务端未允许来自本地页面域名（例如 `http://localhost:5174`）的跨域访问
- 请求携带了不被允许的 header（如自定义 header）但服务端未放行

排查路径：

- Network 中查看失败请求的 Response/Headers
- 检查服务端 CORS 允许的 Origin、Headers、Methods
- 本项目请求默认：`mode: 'cors'`、`credentials: 'omit'`（见 `requestHelper.js`）

## 请求超时/卡住

可能原因：

- API 服务不可达或响应慢
- 流式接口未正确返回 SSE/流式数据

排查路径：

- Network 观察请求耗时与状态
- Console 关注 “请求超时/网络请求失败” 提示
- 请求封装实现位置：[requestHelper.js](../../src/services/helper/requestHelper.js)

## 流式输出不显示/显示不完整

可能原因：

- 服务端并非按 `text/event-stream` 返回
- 中间层代理缓冲导致前端无法及时收到 chunk
- payload 协议字段不匹配（服务端返回 422）

排查路径：

- Network 观察响应 `Content-Type` 是否包含 `text/event-stream`
- 关注 422 是否触发回退重试（`crud.js` 内有一次性回退逻辑）
- 流式实现位置：[crud.js](../../src/services/modules/crud.js)

## 设计相关的排查习惯（建议）

- 先定位层级：页面（views）→ hooks（store/computed/methods）→ services（接口/协议）→ helper（请求/鉴权/状态）
- 先确认资源：静态资源 404 往往会连锁导致“组件加载超时”，先修复网络层再看 JS 报错
- 先确认状态：AICR/News 大量状态会写入 localStorage，遇到诡异 UI 状态可先清缓存再复现

## 可优化点（减少线上故障概率）

- 统一错误展示：把页面内的零散提示收敛到统一的 message/error-state 组件与错误类型映射表
- 更明确的超时提示：组件等待超时应提示“哪个组件名/哪个模块路径”与下一步检查点（404/执行异常）
- 自动诊断开关：debug 模式输出“关键配置快照”（ENV、API_URL、token 是否存在、组件加载列表）
