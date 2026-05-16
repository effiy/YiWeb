# YiWeb — Claude 执行准则

<!-- rui:project-start -->

## 项目画像

| 属性 | 值 |
|------|-----|
| 项目名 | YiWeb |
| 类型 | Frontend（纯静态，零构建） |
| 运行时 | 浏览器原生 ESM |
| UI 框架 | Vue 3.5.26（CDN 全局 `Vue`） |
| 渲染增强 | marked@9.1.6 + mermaid@10.9.1（CDN） |
| 图标 | Font Awesome 6.4.0（CDN） |
| 构建工具 | 无 |
| 包管理器 | 无 |
| 测试框架 | 无 |
| 部署方式 | 静态文件托管（Nginx / CDN） |

### 技术栈详情

- **模块化**：原生 ES Modules（`<script type="module">`），所有 import 使用绝对路径 `/cdn/...` 或 `/src/...`
- **组件系统**：自定义 `registerGlobalComponent`，非 Vue SFC；每组件 = `index.js` + `template.html` + `index.css`
- **状态管理**：基于 `Vue.ref` 的 store 工厂模式，`createStore()` → state + ops（sessions / fileTree / fileContent / ui）
- **请求层**：`requestHelper.js` 封装 `fetch`，支持拦截器、超时（默认 5min）、认证头注入、401 统一处理
- **错误体系**：`ErrorTypes` / `ErrorCodes` + `safeExecute` / `safeExecuteAsync` 统一包裹
- **配置管理**：`src/core/config.js` — 环境切换（local/prod）+ URL 构建 + debug 开关

### 项目结构

```
YiWeb/
├── index.html              # 入口页（仅占位，实际视图在 src/views/）
├── src/
│   ├── core/
│   │   ├── config.js       # 环境配置与 URL 构建
│   │   ├── services/       # 业务服务层
│   │   │   ├── helper/     # requestHelper, authUtils, apiUtils, checkStatus, authErrorHandler
│   │   │   ├── modules/    # crud, goals
│   │   │   └── business/   # requirementAnalysisManager, businessScenarioAnalyzer, sessionSyncService...
│   │   └── utils/          # 通用工具
│   └── views/
│       └── aicr/           # AI 代码审查主视图
│           ├── index.html  # 视图入口（加载 Vue + 组件）
│           ├── index.js    # 应用初始化（createBaseView + createStore）
│           ├── components/ # 视图级组件（aicrPage, aicrHeader, aicrSidebar, codeView, fileTree...）
│           ├── hooks/      # store 工厂与业务方法
│           ├── styles/     # 视图级样式
│           └── utils/      # 视图级工具（resizer, listenerManager, modelService...）
└── cdn/                    # 共享资产库（与 YiWeb 同域部署，可被其他项目复用）
    ├── components/         # 通用组件（YiButton, YiModal, YiLoading, MarkdownView...）
    ├── markdown/           # Markdown 渲染引擎（PluginSystem + 10+ 插件）
    ├── mermaid/            # Mermaid 渲染引擎（PluginSystem + 工具栏插件）
    ├── styles/             # 主题 CSS、工具类、重置样式
    ├── utils/              # 通用工具（core: log, error, api, array, object... | browser: dom, events | view: componentLoader, baseView）
    └── scripts/import-docs/# 文档同步脚本
```

### 安全面

| 风险面 | 现状 | 底线 |
|--------|------|------|
| 用户输入 | DOM 输入、prompt、dialog | 禁止 `innerHTML` 直接赋值未经净化内容；组件模板使用 Vue 插值默认转义 |
| API 调用 | `fetch` + `X-Token` header | Token 仅存 `localStorage`；请求带 `credentials: 'omit'` 防意外 Cookie 泄露 |
| 存储 | `localStorage`（token / model / env / debug）| 敏感值不做 sessionStorage 持久化；清除 token 走 `clearToken` 统一接口 |
| 认证 | 401 统一拦截，弹 `authSettingsDialog` | 禁止在源码中硬编码 token 或密钥 |
| 第三方 CDN | jsdelivr、cdnjs、mermaid、marked | CDN 带 `crossorigin="anonymous"`；降级策略需保留 |
| XSS | Markdown 渲染由 `SanitizePlugin` 处理 | 任何新增 Markdown 插件须通过 sanitize 审查 |

## 执行准则

### 编码规范

1. **模块化**：新增文件必须是 ESM（`export` / `import`），禁止使用 `require` 或全局变量依赖（`window.xxx` 仅做 backward-compat 兜底）
2. **组件格式**：视图级组件放在 `src/views/aicr/components/<ComponentName>/`，共享组件放在 `cdn/components/.../`，每组件必须包含 `index.js` + `template.html` + `index.css`
3. **状态管理**：新增业务状态须走 `createStore` 工厂，在 `hooks/state/storeFactory.js` 或同级注册，禁止在组件内直接 `Vue.ref` 管理跨组件状态
4. **请求封装**：新增 API 调用须通过 `requestHelper.js` 的 `getRequest/postRequest/...`，禁止裸 `fetch`
5. **错误处理**：异步逻辑必须包 `safeExecuteAsync`，同步逻辑包 `safeExecute`，禁止裸 `try/catch` 吞掉错误
6. **日志**：使用 `logInfo / logWarn / logError`（`cdn/utils/core/log.js`），禁止裸 `console.log`
7. **CSS 变量**：颜色/间距优先用 `cdn/styles/theme.css` 的 CSS 变量，禁止硬编码色值

### 退化对策

| 场景 | 对策 |
|------|------|
| CDN 加载失败 | Vue / marked / mermaid / font-awesome 均带 `crossorigin="anonymous"`；核心功能需检测 `typeof Vue !== 'undefined'` |
| localStorage 不可用 | `authUtils.js` 已全路径 `try/catch`，新增存储逻辑须同理包裹 |
| fetch 不支持 | 项目目标环境为现代浏览器，如须兼容老旧环境须显式引入 polyfill |
| 组件加载超时 | `componentLoader.js` 已有超时与重试逻辑，新增组件须注册到 `createBaseView.components` 列表 |

## 项目约束

- **禁止修改源码的入口**：只能走 `/rui code` 管线改源码；直接改 main 分支源码触发 `bad-branch` / `no-checkout`
- **分支隔离**：功能开发必须在 `feat/YiWeb-<name>` 分支，从 main 切出
- **测试缺口**：当前无测试框架；新增核心逻辑（请求层、store、组件）时须同步补充测试用例评审文档（`04-测试用例评审.md`）
- **CDN 目录共享性**：`cdn/` 可能被其他项目复用，修改时须评估 breaking change
- **安全底线**：不硬编码密钥、不关闭 CORS、不绕过 sanitize、不内联 eval

## 自约束

- 每次修改前读取目标文件前 20 行，确认作者注释与依赖路径
- 涉及 Vue 全局时先检测 `typeof Vue !== 'undefined'`
- 涉及 DOM 操作时优先用 `cdn/utils/browser/dom.js` 的封装，而非裸 `document.querySelector`
- 新增样式类名前缀统一为 `yiweb-` 或组件名 kebab-case，避免与第三方库冲突

<!-- rui:project-end -->
