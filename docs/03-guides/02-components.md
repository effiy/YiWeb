# YiWeb 组件开发与加载机制

本文说明本项目组件的文件组织方式、如何注册组件、以及页面如何加载组件模块。

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
  - [baseModal](../../src/components/common/baseModal)
  - [baseLoading](../../src/components/common/baseLoading)
  - [baseEmptyState](../../src/components/common/baseEmptyState)
  - [baseErrorState](../../src/components/common/baseErrorState)
  - [baseIconButton](../../src/components/common/baseIconButton)

也存在只有 JS + CSS 的组件（没有独立 HTML），由 `index.js` 内联模板或动态生成 DOM。

## 通用基础组件（Common）

这些组件用于把页面里高频重复的结构抽成“乐高积木”，特点是：

- 默认复用现有 CSS class（通过 props 传入 className/containerClass 等），避免大改样式
- 只做结构与交互封装，不绑定业务逻辑

### BaseLoading

用于统一加载态结构（spinner + 文案）。

```html
<base-loading text="正在加载..." subtext="可选的次级说明"></base-loading>
```

### BaseErrorState

用于统一错误态结构（icon + message + 可选重试）。

```html
<base-error-state
  :message="error"
  icon-class="fas fa-exclamation-triangle"
  :show-retry="true"
  retry-text="重新加载"
  @retry="reload"
></base-error-state>
```

### BaseEmptyState

用于统一空态结构（标题/副标题/提示 + 可选 icon slot）。

```html
<base-empty-state
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
</base-empty-state>
```

### BaseModal

用于统一遮罩弹窗结构（mask + body + Esc/点击遮罩关闭）。

```html
<base-modal
  :visible="visible"
  wrapper-class="aicr-session-context-modal"
  mask-class="aicr-session-context-modal-mask"
  body-class="aicr-session-context-modal-body"
  aria-label="弹窗标题"
  :body-tabindex="0"
  @close="close"
>
  <div class="modal-body-content">...</div>
</base-modal>
```

### BaseIconButton

用于统一“图标按钮”结构，便于复用 `.icon-button` 一类样式。

```html
<base-icon-button
  class-name="icon-button"
  title="清除"
  aria-label="清除"
  @click="clear"
>
  <i class="fas fa-times" aria-hidden="true"></i>
</base-icon-button>
```

## 组件注册方式（registerGlobalComponent）

组件模块通常在 `index.js` 中调用：

- `registerGlobalComponent({ name, css, html, props, emits, data, computed, methods, ... })`

关键机制：

- CSS：会通过 `<link rel="stylesheet">` 注入到页面
- HTML：会通过 `fetch()` 拉取为字符串作为 `template`
- 注册：最终会把组件对象挂到 `window[ComponentName]`

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
