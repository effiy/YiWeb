# YiWeb

YiWeb 是一个使用原生 JavaScript + Vue 3 构建的前端项目，专注于简化开发流程。

## 核心特性

- 🤖 **AICR 应用** - 带 AI 聊天功能的代码审查界面
- 📦 **CDN 组件库** - 可复用 UI 组件、Markdown/Mermaid 渲染
- 🛠️ **技能系统** - Claude Code 开发规范和文档生成工具

### 设计理念

- 🚀 **零构建** - 浏览器直接运行 ES 模块
- 🎨 **Vue 3** - 组合式 API 开发
- 🔌 **插件化** - Markdown/Mermaid 支持插件扩展
- 📦 **共享优先** - 可复用模块统一放在 `cdn/` 目录

## 快速开始

```bash
cd /var/www/YiWeb
python -m http.server 8000
```

**访问应用**：
- AICR: `http://localhost:8000/src/views/aicr/index.html`

**环境切换**：
- URL 参数: `?env=local`
- localStorage: `localStorage.setItem('env', 'local')`

## 项目结构

```
YiWeb/
├── cdn/              # 共享组件库（UI组件、工具函数、Markdown/Mermaid渲染）
├── src/
│   ├── core/         # 配置、服务、工具
│   └── views/        # 应用入口（aicr）
├── docs/             # 项目文档
└── .claude/skills/   # Claude Code 技能系统
```

## 开发指南

### 核心模式

应用流程：`createBaseView() → createStore() → useComputed() → useMethods()`

### 关键文件

| 文件 | 用途 |
|------|------|
| `src/views/aicr/index.js` | AICR 应用入口 |
| `cdn/utils/view/baseView.js` | Vue 应用工厂 |
| `cdn/markdown/index.js` | Markdown 渲染器 |
| `cdn/mermaid/index.js` | Mermaid 渲染器 |

### 调试对象

- `window.aicrStore` - AICR 状态 Store
- `window.setEnv()` - 切换环境

## 相关文档

- [CLAUDE.md](./CLAUDE.md) - 开发规范
- [docs/README.md](./docs/README.md) - 完整文档
