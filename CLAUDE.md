# YiWeb

<!-- rui:project-start -->

## 项目画像

| 维度 | 描述 |
|------|------|
| **名称** | YiWeb |
| **类型** | Frontend |
| **架构** | Single-page app with view isolation |
| **模块规范** | ESM (browser native) |
| **构建工具** | None — 零构建，浏览器直接加载 ESM |
| **包管理器** | npm（dev deps only；App 运行时零依赖） |
| **视图框架** | 自研 `createBaseView`（store + computed + methods，语义类似 Vue Options API） |
| **组件库** | CDN 托管通用组件（`YiModal`、`YiButton`、`YiTag`、`YiLoading` 等） |
| **渲染增强** | CDN Markdown 渲染器（含 Mermaid、Sanitize、TOC 插件） |
| **状态管理** | `vueRef` 响应式 + 中心化 `store`（hooks/state/） |
| **路由** | 无 — 当前包含 `aicr`、`claude`、`story` 三个视图，通过 `location.href` 切换 |
| **API 层** | 封装 fetch，统一认证头 + 401 处理 + 内存缓存 |
| **测试框架** | Vitest + jsdom（dev only；15 条自主检查规则 + 4 种执行模式） |

## 项目约束

1. **零构建链** — 没有 transpile / bundle / dev server。所有代码必须是浏览器原生可执行的 ESM。禁止使用需要构建的语法（如 JSX、TypeScript、实验性提案）。
2. **无外部包管理（运行时）** — App 运行时不能引入 npm 依赖。第三方功能通过 CDN 模块或自研实现。测试工具（vitest、jsdom）作为 devDependencies 不受此限制。
3. **浏览器安全** — 所有 `fetch` 显式设置 `credentials: 'omit'` 避免意外携带 Cookie；Token 通过 `X-Token` 头传递，存储于 `localStorage`。
4. **视图隔离** — 每个视图在 `src/views/<name>/` 下自包含，通过 `createBaseView` 注册组件、状态、生命周期。
5. **配置即环境** — `src/core/config.js` 按 `local` / `prod` 切换 `DATA_URL`、`API_URL`、`OLLAMA_URL`，不支持其他环境名。

## 执行准则

- **新增视图**：在 `src/views/<name>/` 创建目录，包含 `index.js`（入口）、`index.html`（模板）、`index.css`（样式）。在入口中通过 `createBaseView` 注册组件和数据。
- **新增组件**：通用组件放 `cdn/components/`，业务组件放 `src/views/<view>/components/<ComponentName>/`，同样三件套 `index.js` + `index.html` + `index.css`。
- **新增服务**：API 辅助放 `src/core/services/helper/`，业务模块放 `src/core/services/modules/` 或 `business/`，统一在 `src/core/services/index.js` 聚合导出。
- **状态变更**：所有状态变更走 `store` mutation，禁止跨组件直接修改 `vueRef`。computed 只读，methods 负责副作用。
- **日志与错误**：使用 `cdn/utils/core/log.js` 的 `logInfo/logWarn/logError`，禁止裸 `console.log`。API 错误统一走 `cdn/utils/core/error.js` 的 `ErrorCodes`。

## 退化对策

| 场景 | 对策 |
|------|------|
| 需要现代语法（TS/JSX） | 拒绝 — 零构建链不可破坏；如确有强需求，先引入 Vite 再走 `/rui update` 升级基线 |
| 需要引入 npm 包 | 评估是否可用 CDN ESM 版本；否则自研最小实现 |
| 需要单元测试 | 已引入 Vitest + jsdom；运行 `npm test`；新增测试文件放 `tests/`，遵循 describe/it/expect 模式 |
| 多视图路由 | 当前无路由库；视图切换通过 `location.href` 或自定义路由器实现 |

## 安全面

- **输入**：URLSearchParams（`src/core/config.js`）、文件上传（`src/views/aicr/hooks/projectZipMethods.js`）、聊天输入（`src/views/aicr/hooks/methods/inputMethods.js`）、故事面板数据加载（`src/views/story/`）、Claude 面板数据加载（`src/views/claude/`）。
- **API**：所有后端请求经 `src/core/services/helper/requestHelper.js` → `src/core/services/modules/crud.js`，支持自动重试、批量、缓存。
- **存储**：`localStorage` 存 `X-Token`、`env`、`debug`；`sessionStorage` 未使用。
- **认证**：`src/core/services/helper/authUtils.js` 管理 Token 生命周期；`src/core/services/helper/authErrorHandler.js` 拦截 401 并触发登录弹窗。
- **第三方**：Markdown 渲染启用 `SanitizePlugin`，防止 XSS。

<!-- rui:project-end -->
