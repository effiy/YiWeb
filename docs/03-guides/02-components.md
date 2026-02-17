# YiWeb 组件开发与加载机制

本文说明本项目组件的文件组织方式、如何注册组件、以及页面如何加载组件模块。

## 设计思想与约束

- 目标：组件可在“无构建、纯静态服务器”环境直接运行，因此采用“JS 模块 + 可选 HTML/CSS 外部文件”的组织方式
- 约束：组件加载顺序不可控（动态 import/网络抖动），因此采用“先写入 window，再统一注册到 Vue app”的桥接策略
- 取舍：外部模板（HTML）便于做大块结构维护，但会多一次 fetch；内联模板减少请求但可读性更差，按场景取舍

## 组件文件结构约定

大多数可复用组件采用“三文件分离”结构：

```text
src/components/<scope>/<componentName>/
  index.js
  index.html        # 可选（如使用外部模板）
  index.css         # 可选
```

示例：

- 搜索头组件：[searchHeader](../../src/components/common/searchHeader)
- 新闻列表组件：[newsList](../../src/components/business/newsList)
- 通用基础组件：
  - [yiModal](../../src/components/common/yiModal)
  - [yiLoading](../../src/components/common/yiLoading)
  - [yiEmptyState](../../src/components/common/yiEmptyState)
  - [yiErrorState](../../src/components/common/yiErrorState)
  - [yiIconButton](../../src/components/common/yiIconButton)
  - [yiButton](../../src/components/common/yiButton)
  - [yiTag](../../src/components/common/yiTag)

也存在只有 JS + CSS 的组件（没有独立 HTML），由 `index.js` 内联模板或动态生成 DOM。

## 通用基础组件（Common）

这些组件用于把页面里高频重复的结构抽成“乐高积木”，特点是：

- 默认复用现有 CSS class（通过 props 传入 className/containerClass 等），避免大改样式
- 只做结构与交互封装，不绑定业务逻辑

### YiLoading

用于统一加载态结构（spinner + 文案）。

```html
<yi-loading text="正在加载..." subtext="可选的次级说明"></yi-loading>
```

### YiErrorState

用于统一错误态结构（icon + message + 可选重试）。

```html
<yi-error-state
  :message="error"
  icon-class="fas fa-exclamation-triangle"
  :show-retry="true"
  retry-text="重新加载"
  @retry="reload"
></yi-error-state>
```

### YiEmptyState

用于统一空态结构（标题/副标题/提示 + 可选 icon slot）。

```html
<yi-empty-state
  wrapper-class="empty-state"
  :cardless="true"
  title="暂无数据"
  subtitle="请稍后重试"
  title-class="empty-title"
  subtitle-class="empty-subtitle"
>
  <template #icon>
    <div class="empty-icon" aria-hidden="true">
      <i class="fas fa-inbox" aria-hidden="true"></i>
    </div>
  </template>
</yi-empty-state>
```

### YiModal

用于统一遮罩弹窗结构（mask + body + Esc/点击遮罩关闭）。

```html
<yi-modal
  :visible="visible"
  wrapper-class="aicr-session-context-modal"
  mask-class="aicr-session-context-modal-mask"
  body-class="aicr-session-context-modal-body"
  aria-label="弹窗标题"
  :body-tabindex="0"
  @close="close"
>
  <div class="modal-body-content">...</div>
</yi-modal>
```

### YiIconButton

用于统一“图标按钮”结构，便于复用 `.icon-button` 一类样式。

```html
<yi-icon-button
  class-name="icon-button"
  title="清除"
  aria-label="清除"
  @click="clear"
>
  <i class="fas fa-times" aria-hidden="true"></i>
</yi-icon-button>
```

## 组件注册方式（registerGlobalComponent）

组件模块通常在 `index.js` 中调用：

- `registerGlobalComponent({ name, css, html, props, emits, data, computed, methods, ... })`

关键机制：

- CSS：会通过 `<link rel="stylesheet">` 注入到页面
- HTML：会通过 `fetch()` 拉取为字符串作为 `template`
- 注册：最终会把组件对象挂到 `window[ComponentName]`
- 缓存：HTML 模板会按 URL 做内存缓存，并在 localStorage 里做带 TTL 的持久化缓存（默认 7 天）
- 可观测：组件注册完成后会派发 `${ComponentName}Loaded` 事件（用于更低耦合的等待/装配）

实现位置：

- [componentLoader.js](../../src/utils/view/componentLoader.js)

## 页面如何加载组件

页面入口 `src/views/**/index.js` 会把组件模块路径放入 `componentModules`，并把需要的组件名放入 `components`：

- `componentModules`：例如 `/src/components/common/searchHeader/index.js`
- `components`：例如 `SearchHeader`

装配层会先动态 `import(componentModules)`，再等待 `window[ComponentName]` 可用，最后把它注册到 Vue app：

- 装配位置：[baseView.js](../../src/utils/view/baseView.js)
  - `loadJSFiles(componentModules)`
  - `waitForComponents(components)`
  - `registerComponents(app, components)`

## 新增一个组件（推荐步骤）

1. 在 `src/components/...` 下创建组件目录与 `index.js`（按同级组件风格）
2. 在组件 `index.js` 中调用 `registerGlobalComponent` 并保证 `name` 是 PascalCase
3. 在目标页面 `src/views/<page>/index.js`：
   - `componentModules` 增加该组件模块路径
   - `components` 增加组件名（与 `name` 一致）
4. 在页面 `index.html` 中使用组件标签（kebab-case 或 PascalCase 均可）

常见问题：

- “组件加载超时”：通常是 `componentModules` 未正确加载、路径 404、或组件 `name` 与 `components` 列表不一致
- “模板加载失败”：检查组件 `html` 路径是否正确，Network 中是否返回 200

## 优化建议（偏可维护性与性能）

- 组件资源缓存：组件 HTML 模板已具备内存 + localStorage 缓存；CSS 注入已做去重，新增组件时尽量沿用该机制
- 组件可观测性：优先使用 `${ComponentName}Loaded` 事件做装配等待，减少轮询带来的不确定性；超时提示优先落在“路径 404 / 执行异常 / name 不一致”
- 组件边界：将 `common` 坚持做“纯 UI + 事件”，避免把业务流程塞进通用组件，减少耦合与复用成本
- 组件职责：组件内部尽量不直接发起网络请求；优先通过页面装配层提供的能力（例如 `provide/inject` 或 props 传入的函数）来触发“数据动作”，把协议与鉴权细节收敛到 `services`
