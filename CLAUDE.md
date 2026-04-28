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

- `src/` - 源代码目录
  - `views/` - 视图应用
    - `aicr/` - 代码审查页面
  - `core/` - 核心服务和配置
- `cdn/` - CDN 资源
  - `components/` - Vue 组件库（被 AICR 使用）
  - `utils/` - 工具函数
  - `styles/` - 共享样式
  - `markdown/` - Markdown 渲染系统
  - `mermaid/` - Mermaid 渲染系统

### cdn 目录重构说明

**当前状态**：第一阶段完成（文档完善）

- ✅ 已完成：完整的需求、设计、使用文档集
- ⏳ 待决策：是否进行第二阶段（组件去留）

**关键发现**：AICR 页面仍在使用以下 cdn/components 下的组件：
- `YiModal`、`YiLoading`、`YiEmptyState`、`YiErrorState`
- `YiIconButton`、`YiButton`、`YiTag`、`YiSelect`
- `SearchHeader`、`MarkdownView`、`SkeletonLoader`

**详细文档**：参见 `docs/重构cdn目录/`
- `docs/` - 项目文档
- `.claude/skills/` - Claude Code 技能系统

## 编码规范

- 命名：camelCase（变量函数）、PascalCase（组件）、UPPER_SNAKE_CASE（常量）
- 组件：使用 `registerGlobalComponent` 全局注册，支持模板缓存
- 状态管理：使用 `createStore` + `useComputed` + `useMethods` 模式
- 样式：CSS 样式使用 kebab-case，共享样式在 `cdn/styles/`
- 模块导入：使用绝对路径，以 `/` 开头

## 禁止事项

- 禁止在组件中硬编码环境配置（应从 `src/core/config.js` 读取）
- 禁止修改与当前任务无关的文件
- 禁止重构没有问题的代码
- 禁止使用 npm/yarn 安装依赖（本项目无需构建工具）
- 禁止使用 `var`，应使用 `const` 或 `let`

## 构建与运行

- 安装：无需安装依赖
- 开发：使用 `python -m http.server 8000` 启动本地服务器
- 构建：无需构建
- 测试：待补充

访问应用：
- AICR：http://localhost:8000/src/views/aicr/index.html

环境切换：
- URL 参数：`?env=local`
- localStorage：`localStorage.setItem('env', 'local')`

## 关键文件

- `src/views/aicr/index.js` - 代码审查页面入口
- `cdn/utils/view/baseView.js` - Vue 应用工厂函数
- `cdn/utils/view/componentLoader.js` - 组件加载器
- `cdn/utils/core/error.js` - 错误处理工具
- `src/core/config.js` - 配置文件

## 文档体系

- `/generate-document <功能名>-描述` - 生成功能文档集
- `/generate-document init` - 初始化项目基础文件
- `/implement-code <功能名>` - 实施代码
