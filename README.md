# YiWeb

YiWeb 是一个零构建、原生 ES Modules + Vue 3 的前端项目，专注于 AI 辅助代码审查（AICR）及共享组件体系。

## 设计理念

- **零构建** — 浏览器直接运行 ES 模块，无需打包工具
- **Vue 3 组合式 API** — CDN 加载，`createBaseView` 应用工厂模式
- **插件架构** — Markdown / Mermaid 渲染系统支持插件扩展
- **共享优先** — 跨应用复用的组件和工具统一放在 `cdn/` 目录
- **环境切换** — URL 参数 / localStorage / API 三通道切换 local ↔ prod

## 快速开始

```bash
cd /var/www/YiWeb
python -m http.server 8080
```

访问 AICR：`http://localhost:8080/src/views/aicr/index.html`

环境切换至本地：

```js
localStorage.setItem('env', 'local')
// 或 URL: ?env=local
// 或: window.setEnv('local')
```

## 项目结构

```
YiWeb/
├── cdn/                     # 共享资源（跨应用复用）
│   ├── components/          #   Vue 组件库
│   │   ├── common/          #     通用组件（按钮/模态框/表单/反馈/标签/加载器）
│   │   └── business/        #     业务组件（MarkdownView/SearchHeader/SkeletonLoader）
│   ├── utils/               #   工具函数
│   │   ├── core/            #     http, api, error, storage, log, i18n, validation
│   │   ├── view/            #     Vue 应用工厂 (baseView, componentLoader)
│   │   ├── ui/              #     message, dialog, loading
│   │   ├── browser/         #     dom, events
│   │   ├── time/            #     date, timeParams
│   │   ├── data/            #     domain, dataUtils
│   │   └── io/              #     exportUtils
│   ├── styles/              #   共享样式 (theme.css, reset.css, utilities.css)
│   ├── markdown/            #   Markdown 渲染系统（插件架构）
│   └── mermaid/             #   Mermaid 图表渲染系统
├── src/                     # 应用源代码
│   ├── core/                #   全局配置 (config.js) + 服务层 (services/)
│   └── views/               #   视图应用
│       └── aicr/            #   AICR 代码审查页面
│           ├── index.html   #     HTML 入口
│           ├── index.js     #     应用入口（createBaseView 工厂）
│           ├── hooks/       #     组合式 hooks
│           ├── components/  #     AICR 专属组件
│           └── styles/      #     AICR 专属样式
├── docs/                    # 项目文档
├── tests/                   # 测试目录
├── .claude/                 # Claude Code 配置（技能系统/行为准则）
└── index.html               # 根入口（品牌页）
```

## 技术栈

| 技术 | 加载方式 | 用途 |
|------|---------|------|
| Vue 3 | CDN | 前端框架 |
| ES Modules | 原生浏览器 | 模块系统 |
| Mermaid | CDN | 图表渲染 |
| Markdown-it | CDN | Markdown 渲染 |

## 核心架构

### 应用启动流程

```
config.js → services/ → hooks/ (store + useComputed + useMethods) → components/ → baseView.js → 挂载 #app
```

### 组件加载模式

1. **声明式** — `components: ['YiModal', 'YiButton', ...]`
2. **模块式** — `componentModules: ['/path/to/component/index.js', ...]`
3. **全局注册** — 组件通过 `window[ComponentName]` 暴露，`registerGlobalComponent` 注册
4. **模板缓存** — `loadTemplate()` 内存缓存 + localStorage 双层缓存

### 环境配置

单一声源 `src/core/config.js`，支持三种切换方式：

| 方式 | 用法 |
|------|------|
| URL 参数 | `?env=local` |
| localStorage | `localStorage.setItem('env', 'local')` |
| 编程 | `window.setEnv('local')` |

### 调试对象

| 对象 | 说明 |
|------|------|
| `window.__ENV__` | 当前环境配置 |
| `window.aicrStore` | AICR 状态 Store |
| `window.setEnv()` | 切换环境 |

## 开发约定

| 规范 | 说明 |
|------|------|
| 命名 | camelCase（变量/函数）、PascalCase（组件）、UPPER_SNAKE_CASE（常量） |
| CSS | kebab-case，共享样式在 `cdn/styles/` |
| 模块导入 | 绝对路径，以 `/` 开头 |
| 变量声明 | 使用 `const` 或 `let`，禁止 `var` |
| 环境配置 | 从 `src/core/config.js` 读取，禁止硬编码 |
| 模块暴露 | ESM `export` + `window.*` 全局暴露（向后兼容） |

## Claude Code 技能

| 命令 | 说明 |
|------|------|
| `/build-feature` | 完整 SDLC（文档 → 代码 → 交付） |
| `/implement-code <name>` | 实施代码 |
| `/generate-document <name>` | 生成功能文档集 |
| `/code-review` | 代码审查 |
| `/e2e-testing` | E2E 测试方案设计 |
| `/verification-loop` | 验证循环 |
| `/review` | PR 审查 |
| `/security-review` | 安全审查 |

## 文档

| 文档 | 说明 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | 开发规范与行为准则 |
| [docs/architecture.md](./docs/architecture.md) | 架构约定 |
| [docs/changelog.md](./docs/changelog.md) | 变更日志 |
| [docs/devops.md](./docs/devops.md) | 构建/部署/运维 |
| [docs/network.md](./docs/network.md) | 网络请求约定 |
| [docs/state-management.md](./docs/state-management.md) | 状态管理约定 |
| [docs/FAQ.md](./docs/FAQ.md) | 常见问题与自愈 |
| [docs/auth.md](./docs/auth.md) | 认证鉴权方案 |
| [docs/security.md](./docs/security.md) | 安全策略 |
