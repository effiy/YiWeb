# YiWeb

> AI 代码审查前端应用 — 纯静态、零构建、浏览器原生 ESM。

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
| 测试框架 | 无 |
| 部署方式 | 静态文件托管（Nginx / CDN） |

## 快速开始

```bash
# 本地预览（任意静态服务器）
python3 -m http.server 8080
# 或
npx serve .
```

访问 `http://localhost:8080/src/views/aicr/index.html` 进入 AI 代码审查视图。

环境切换：URL 参数 `?env=local` 或 localStorage 设置 `env=local/prod`。

## 项目结构

```
YiWeb/
├── index.html              # 入口页（仅占位）
├── src/
│   ├── core/
│   │   ├── config.js       # 环境配置与 URL 构建
│   │   ├── services/       # 业务服务层
│   │   └── utils/          # 通用工具
│   └── views/
│       └── aicr/           # AI 代码审查主视图
│           ├── index.html  # 视图入口
│           ├── index.js    # 应用初始化
│           ├── components/ # 视图级组件
│           ├── hooks/      # store 工厂与业务方法
│           ├── styles/     # 视图级样式
│           └── utils/      # 视图级工具
└── cdn/                    # 共享资产库
    ├── components/         # 通用组件
    ├── markdown/           # Markdown 渲染引擎
    ├── mermaid/            # Mermaid 渲染引擎
    ├── styles/             # 主题 CSS
    ├── utils/              # 通用工具
    └── scripts/import-docs/# 文档同步脚本
```

## 管线一览

```mermaid
flowchart LR
    A[需求解析] --> B[自适应规划] --> C[影响分析] --> D[架构设计] --> E[文档生成]
    E --> F[预检<br/>分支隔离] --> G[Gate A<br/>测试先行] --> H[实现] --> I[Gate B<br/>验证] --> J[自改进] --> K[交付]
```

| 命令 | 用途 |
|------|------|
| `/rui init` | 建立项目基线 |
| `/rui doc <req>` | 拆需求为故事 + 生成文档基线 |
| `/rui code <name>` | 实现故事 + 生成验证报告 |
| `/rui <req>` | 端到端（doc + code） |
| `/rui list` | 进度全景 |
| `/rui` | 任务推荐 |

## 技术细节

- **模块化**：原生 ES Modules，import 使用绝对路径 `/cdn/...` 或 `/src/...`
- **组件系统**：非 Vue SFC，每组件 = `index.js` + `template.html` + `index.css`
- **状态管理**：基于 `Vue.ref` 的 store 工厂模式
- **请求层**：`requestHelper.js` 封装 `fetch`，拦截器 + 超时 + 401 统一处理
- **错误体系**：`ErrorTypes` / `ErrorCodes` + `safeExecute` / `safeExecuteAsync`
- **配置管理**：`src/core/config.js` — 环境切换（local/prod）+ debug 开关
