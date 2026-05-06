# CLAUDE.md

行为规范见 .claude/shared/behavioral-guidelines.md
项目架构约定见 docs/architecture.md

## 技术栈

- Vue 3（CDN 方式）
- 原生 ES Modules
- 无构建工具（直接使用浏览器原生模块）
- Markdown 渲染插件系统
- Mermaid 图表渲染

## 项目结构

```
YiWeb/
├── cdn/                        # 共享资源（跨应用复用）
│   ├── components/             #   Vue 组件库
│   │   ├── common/             #     通用组件（按钮/模态框/表单/反馈/加载器/标签）
│   │   └── business/           #     业务组件（MarkdownView/SearchHeader/SkeletonLoader）
│   ├── utils/                  #   工具函数
│   │   ├── core/               #     http, api, error, storage, log, i18n, validation, eventBus
│   │   ├── view/               #     Vue 应用工厂 (baseView, componentLoader, registry)
│   │   ├── ui/                 #     message, dialog, loading, template
│   │   ├── browser/            #     dom, events
│   │   ├── time/               #     date, timeParams, timeSelectors
│   │   ├── data/               #     domain, dataUtils
│   │   └── io/                 #     exportUtils
│   ├── styles/                 #   共享样式 (theme.css, reset.css, utilities.css)
│   ├── markdown/               #   Markdown 渲染系统（插件架构）
│   └── mermaid/                #   Mermaid 图表渲染系统
├── src/                        # 应用源代码
│   ├── core/                   #   全局配置 + 服务
│   │   ├── config.js           #     环境配置（local/prod 端点切换）
│   │   ├── services/           #     API 服务层
│   │   └── utils/              #     应用级工具
│   └── views/                  #   视图应用
│       └── aicr/               #     AICR 代码审查页面
│           ├── index.html      #       HTML 入口
│           ├── index.js        #       应用入口 (createBaseView)
│           ├── hooks/          #       组合式 hooks (store, useComputed, useMethods)
│           ├── components/     #       AICR 专属组件
│           └── styles/         #       AICR 专属样式
├── docs/                       # 项目文档
├── tests/                      # 测试目录
├── .claude/                    # Claude Code 配置
│   ├── skills/                 #   技能系统
│   ├── shared/                 #   共享行为准则
│   └── docs/                   #   执行记录
└── index.html                  # 根入口（品牌页）
```

### 放置规则

| 内容类型 | 放置位置 | 原因 |
|---------|---------|------|
| 跨应用复用的 Vue 组件 | `cdn/components/` | 多应用共享 |
| 通用工具函数 | `cdn/utils/` | 框架无关的基础工具 |
| Vue 特有工具 | `cdn/utils/view/` | 仅 Vue 应用使用 |
| 应用专属组件 | `src/views/<app>/components/` | 不跨应用复用 |
| 全局配置 | `src/core/config.js` | 单一声源 |
| API 服务 | `src/core/services/` | 按业务模块组织 |
| 共享样式 | `cdn/styles/` | 跨应用一致的视觉体系 |

## 编码规范

- 命名：camelCase（变量函数）、PascalCase（组件）、UPPER_SNAKE_CASE（常量）
- 组件：使用 `registerGlobalComponent` 全局注册，支持模板缓存
- 状态管理：使用 `createStore` + `useComputed` + `useMethods` 模式
- 样式：CSS 使用 kebab-case，共享样式在 `cdn/styles/`
- 模块导入：使用绝对路径，以 `/` 开头
- 变量声明：使用 `const` 或 `let`
- 模块暴露：同时支持 ESM `export` 和 `window.*` 全局暴露（向后兼容）

## 禁止事项

- 禁止在组件中硬编码环境配置（应从 `src/core/config.js` 读取）
- 禁止修改与当前任务无关的文件
- 禁止重构没有问题的代码
- 禁止使用 npm/yarn 安装依赖（本项目无需构建工具）
- 禁止使用 `var`

## 构建与运行

- 安装：无需安装依赖
- 开发：`python -m http.server 8080`
- 构建：无需构建
- 测试：待补充

访问应用：
- AICR：http://localhost:8080/src/views/aicr/index.html

环境切换：
- URL 参数：`?env=local`
- localStorage：`localStorage.setItem('env', 'local')`
- 编程方式：`window.setEnv('local')`

## 关键文件

| 文件 | 用途 |
|------|------|
| `src/views/aicr/index.js` | AICR 应用入口 |
| `src/views/aicr/index.html` | AICR HTML 入口 |
| `src/core/config.js` | 环境配置（单一声源） |
| `cdn/utils/view/baseView.js` | Vue 应用工厂函数 |
| `cdn/utils/view/componentLoader.js` | 组件加载器 |
| `cdn/utils/core/error.js` | 错误处理工具 |
| `cdn/utils/core/http.js` | HTTP 请求封装 |
| `cdn/utils/core/storage.js` | 本地存储封装 |
| `cdn/markdown/index.js` | Markdown 渲染器 |
| `cdn/mermaid/index.js` | Mermaid 渲染器 |

### 调试对象

- `window.aicrStore` - AICR 状态 Store
- `window.setEnv()` - 切换环境
- `window.__ENV__` - 当前环境配置

## 文档体系

| 文档 | 说明 |
|------|------|
| [docs/architecture.md](docs/architecture.md) | 架构约定 |
| [docs/changelog.md](docs/changelog.md) | 变更日志 |
| [docs/devops.md](docs/devops.md) | 构建/部署/运维 |
| [docs/network.md](docs/network.md) | 网络请求约定 |
| [docs/state-management.md](docs/state-management.md) | 状态管理约定 |
| [docs/FAQ.md](docs/FAQ.md) | 常见问题与自愈 |
| [docs/auth.md](docs/auth.md) | 认证鉴权方案 |
| [docs/security.md](docs/security.md) | 安全策略 |
| [docs/project-init/](docs/project-init/) | 项目初始化文档集 |

## Claude Code 技能

可用技能（通过 `/` 前缀调用）：

| 命令 | 说明 |
|------|------|
| `/build-feature` | 完整 SDLC：文档生成 → 代码实现 → 交付 |
| `/generate-document <功能名>` | 生成功能文档集 |
| `/implement-code <功能名>` | 实施代码 |
| `/code-review` | 代码审查 |
| `/e2e-testing` | E2E 测试方案设计 |
| `/verification-loop` | 验证循环（构建/集成/部署） |
| `/search-first` | 技术选型前的并行搜索评估 |
| `/import-docs` | 本地文档同步到远程 |
| `/wework-bot` | 发送企业微信通知 |
| `/review` | PR 审查 |
| `/security-review` | 安全审查 |
