# YiWeb 架构与页面装配

本文面向“读代码/二次开发”，解释项目运行形态、页面启动流程、以及各层职责分工。

## 运行形态概览

- 页面以静态 HTML 的形式提供入口，浏览器端运行
- 通过 CDN 引入 Vue3（`Vue` 全局变量）
- 项目内代码以原生 ES Modules 方式加载（`<script type="module">` 与动态 `import()`）
- 组件定义会被注册到 `window` 上，再由页面装配层统一注册到 Vue 应用

## 页面入口

每个页面通常由三件套组成：

- `src/views/<page>/index.html`：页面结构与第三方 CDN 依赖
- `src/views/<page>/index.css`：页面级样式
- `src/views/<page>/index.js`：页面逻辑入口，负责装配并挂载

示例入口：

- 新闻页：[index.html](../../src/views/news/index.html) / [index.js](../../src/views/news/index.js)
- AICR 页：[index.html](../../src/views/aicr/index.html) / [index.js](../../src/views/aicr/index.js)

## 页面装配流程（createBaseView）

页面 `index.js` 通常调用 [createBaseView](../../src/utils/view/baseView.js) 来完成装配：

1. 加载页面需要的组件模块（`componentModules`）
2. 等待组件注册完成（`waitForComponents` 轮询 `window[ComponentName]` 是否存在）
3. 创建 Vue 应用并注册组件
4. 把页面 HTML 中 `#app` 的静态模板抓取出来作为根模板，再清空容器，最后挂载

关键实现位置：

- 应用创建与挂载：[baseView.js](../../src/utils/view/baseView.js)
  - `createAndMountApp()`：从 `#app` 抓取静态模板并清空，避免挂载时 DOM 不一致
  - `loadJSFiles()`：优先 `import(jsFile)`，失败后回退为 `<script type="module" src="...">`
  - `waitForComponents()`：等待 `window[ComponentName]` 就绪（默认超时 5s）

## Store / Computed / Methods 分层

页面通常按以下方式组织状态与逻辑：

- `hooks/store.js`：创建页面状态（通常使用 `Vue.ref` 等）
- `hooks/useComputed.js`：派生数据（计算属性）
- `hooks/useMethods.js`：业务动作（事件处理、请求调用、状态更新）

`createBaseView()` 会在 `setup()` 中依次调用它们，并把返回结果合并后暴露给模板使用：

- `store` → 响应式状态
- `computedProps` → 计算属性
- `methods` → 事件/动作方法

## 组件加载与注册（window 全局桥接）

为了适配“模块加载顺序不确定”的场景，项目采用“先挂到 window，再由 baseView 统一注册”的桥接策略：

- 组件模块通过 [componentLoader.js](../../src/utils/view/componentLoader.js) 的 `registerGlobalComponent` 或 `defineComponent` 生成组件对象
- 组件对象会被写入 `window[ComponentName]`
- `baseView.registerComponents()` 在等待后把 `window[ComponentName]` 注册到 Vue 应用

关键实现位置：

- 组件定义/模板加载：[componentLoader.js](../../src/utils/view/componentLoader.js)

## 与后端交互的位置

- 配置（`API_URL`/`DATA_URL`）：[config.js](../../src/config.js)
- 请求封装：[requestHelper.js](../../src/services/helper/requestHelper.js)
- CRUD 与流式：[crud.js](../../src/services/modules/crud.js)
- 401 与鉴权提示：[authErrorHandler.js](../../src/services/helper/authErrorHandler.js)

