# 统一共享组件库

本目录包含所有项目共享的主题、组件和工具函数。

## 目录结构

```
shared/
├── styles/
│   └── theme.css          # 统一量子美学主题
├── mermaid/
│   ├── config.js          # Mermaid 配置
│   ├── renderer.js        # Mermaid 渲染器
│   ├── templates.js       # UI 模板
│   ├── ui.js              # UI 交互组件
│   ├── index.js           # 模块入口（ES Module）
│   └── global.js          # 全局版本（UMD）
├── utils/
│   └── index.js           # 通用工具函数库
├── components/
│   ├── index.css          # 通用组件样式
│   └── index.js           # 通用组件构建函数
└── README.md
```

---

## 主题使用方法

### 在 HTML 中引入

```html
<!-- 引入统一主题 -->
<link rel="stylesheet" href="/shared/styles/theme.css">
```

### CSS 变量

主要 CSS 变量：

```css
/* 主色 */
--primary: #667eea;
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);

/* 辅助色 */
--accent: #06b6d4;
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;

/* 背景 */
--bg-primary: #0f172a;
--bg-secondary: #1e293b;

/* 文字 */
--text-primary: #f8fafc;
--text-secondary: #e2e8f0;
```

---

## 通用工具函数库 (`utils/`)

### 引入使用

```javascript
import {
  escapeHtml,
  storage,
  debounce,
  formatDate,
  generateId,
  copyToClipboard,
  showToast
} from '/shared/utils/index.js';
```

### 工具类别

| 类别 | 函数 |
|------|------|
| **HTML处理** | `escapeHtml`, `unescapeHtml`, `escapeHtmlAttr`, `escapeJs`, `stripHtml` |
| **URL安全** | `sanitizeUrl`, `parseQuery`, `buildQuery` |
| **字符串** | `truncate`, `capitalize`, `uncapitalize`, `camelToKebab`, `kebabToCamel`, `snakeToCamel`, `camelToSnake`, `generateId`, `uuid`, `template`, `trimStart`, `trimEnd`, `titleize`, `strWidth` |
| **数字** | `clamp`, `formatNumber`, `formatFileSize`, `ordinal`, `isInteger`, `toNumber`, `percent` |
| **数组** | `unique`, `groupBy`, `chunk`, `shuffle`, `findAll`, `remove`, `flatten`, `intersection`, `difference` |
| **对象** | `deepClone`, `get`, `set`, `merge`, `deepMerge`, `pick`, `omit`, `mapKeys`, `mapValues`, `toPairs`, `fromPairs` |
| **时间** | `formatDate`, `timeAgo`, `isToday`, `isSameDay`, `startOfDay`, `endOfDay` |
| **防抖节流** | `debounce`, `throttle` (带 cancel 方法) |
| **存储** | `storage` (localStorage), `sessionStorage`, `getCookie`, `setCookie`, `deleteCookie` |
| **类型检查** | `isString`, `isNumber`, `isBoolean`, `isArray`, `isObject`, `isFunction`, `isEmpty`, `isEmail`, `isPhone`, `isUrl`, `isHexColor` |
| **颜色** | `hexToRgb`, `rgbToHex`, `getContrastColor`, `colorAlpha`, `lighten`, `darken` |
| **随机** | `random`, `randomInt`, `sample`, `randomString`, `randomColor` |
| **浏览器** | `copyToClipboard`, `downloadFile`, `safeJsonParse`, `scrollToTop`, `scrollToElement`, `getSelectedText`, `toggleFullscreen`, `isInViewport`, `printElement` |
| **异步** | `sleep`, `withTimeout`, `retry` |
| **函数式** | `pipe`, `compose`, `curry`, `memoize` |

### 使用示例

```javascript
// 存储
storage.set('user', { name: 'test' });
const user = storage.get('user', {});

// 防抖
const handleSearch = debounce((query) => {
  console.log('搜索:', query);
}, 300);

// 时间格式化
formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
timeAgo(new Date(Date.now() - 3600000)); // "1 小时前"

// ID 生成
const id = generateId('component'); // "component-1234567890-abc123"

// 复制
await copyToClipboard('要复制的文本');
```

---

## 通用组件库 (`components/`)

### 引入使用

```html
<!-- 引入样式 -->
<link rel="stylesheet" href="/shared/styles/theme.css">
<link rel="stylesheet" href="/shared/components/index.css">

<!-- 引入组件函数 -->
<script type="module">
  import {
    createButton,
    createCard,
    createAlert,
    createModal,
    showToast,
    openModal,
    closeModal
  } from '/shared/components/index.js';
</script>
```

### 可用组件

#### 按钮 (Button)

```html
<button class="btn btn-primary">主按钮</button>
<button class="btn btn-secondary">次要按钮</button>
<button class="btn btn-ghost">幽灵按钮</button>
<button class="btn btn-accent">强调按钮</button>
<button class="btn btn-success">成功</button>
<button class="btn btn-warning">警告</button>
<button class="btn btn-danger">危险</button>
<button class="btn btn-gradient">渐变按钮</button>

<button class="btn btn-primary btn-sm">小按钮</button>
<button class="btn btn-primary btn-lg">大按钮</button>
<button class="btn btn-primary btn-icon">
  <svg>...</svg>
</button>
```

使用 JS 构建：

```javascript
document.body.innerHTML += createButton({
  text: '点击我',
  variant: 'primary',
  size: 'md',
  icon: '<svg>...</svg>',
  loading: false,
  disabled: false,
  ripple: true,    // 波纹效果
  pulse: false,    // 脉冲效果
  onclick: 'handleClick()'
});
```

**增强功能：**
- `ripple: true` - 点击波纹效果
- `pulse: true` - 脉冲动画
- `loading: true` - 加载状态
- 渐变背景、发光效果、悬停上浮

```javascript
// 按钮组
createButtonGroup([
  { text: '按钮1', variant: 'primary' },
  { text: '按钮2', variant: 'secondary' }
]);
```

#### 卡片 (Card)

```html
<div class="card">
  <div class="card-header">卡片标题</div>
  <div class="card-body">卡片内容</div>
  <div class="card-footer">卡片底部</div>
</div>

<div class="card card-elevated">...</div>
<div class="card card-glass">...</div>
<div class="card card-hover">...</div>
```

使用 JS 构建：

```javascript
document.body.innerHTML += createCard({
  header: '标题',
  body: '<p>内容</p>',
  footer: '<button>操作</button>',
  variant: 'default',
  hoverable: true
});
```

#### 标签 (Tag)

```html
<span class="tag tag-primary">主要</span>
<span class="tag tag-accent">强调</span>
<span class="tag tag-success">成功</span>
<span class="tag tag-warning">警告</span>
<span class="tag tag-error">错误</span>
<span class="tag tag-gray">灰色</span>
```

使用 JS 构建：

```javascript
document.body.innerHTML += createTag({
  text: '标签文字',
  variant: 'primary',
  size: 'md',      // sm | md | lg
  icon: '<svg>...</svg>',
  clickable: true, // 可点击
  active: false,   // 激活状态
  disabled: false  // 禁用状态
});
```

#### 输入框 (Input)

```html
<input class="input" type="text" placeholder="请输入...">
<input class="input input-sm" type="text" placeholder="小输入框">
<input class="input input-lg" type="text" placeholder="大输入框">

<div class="input-wrapper">
  <span class="input-icon">🔍</span>
  <input class="input" type="text" placeholder="搜索...">
</div>
```

#### 提示 (Alert)

```html
<div class="alert alert-info" role="alert">
  <svg class="alert-icon">...</svg>
  <div class="alert-content">
    <div class="alert-title">标题</div>
    <div class="alert-message">提示信息</div>
  </div>
</div>

<div class="alert alert-success">成功提示</div>
<div class="alert alert-warning">警告提示</div>
<div class="alert alert-error">错误提示</div>
```

使用 JS 构建：

```javascript
document.body.innerHTML += createAlert({
  title: '提示标题',
  message: '提示内容',
  variant: 'info',  // info | success | warning | error
  dismissible: true
});
```

#### 模态框 (Modal)

```html
<div class="modal-overlay" style="display: flex;">
  <div class="modal modal-md">
    <div class="modal-header">
      <h3 class="modal-title">模态框标题</h3>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">
      模态框内容
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary">取消</button>
      <button class="btn btn-primary">确定</button>
    </div>
  </div>
</div>
```

使用 JS 构建：

```javascript
document.body.innerHTML += createModal({
  id: 'my-modal',
  title: '模态框标题',
  content: '<p>模态框内容</p>',
  footer: '<button class="btn btn-primary" onclick="submit()">确定</button>',
  size: 'md'  // sm | md | lg | xl | full
});

openModal('my-modal');
closeModal('my-modal');
```

#### 空状态 (Empty State)

```javascript
document.body.innerHTML += createEmptyState({
  title: '暂无数据',
  description: '这里还没有内容',
  action: '<button class="btn btn-primary">添加</button>'
});
```

#### Toast 提示

```javascript
showToast('操作成功！', 'success');  // success | error | warning | info
showToast('这是一条提示', 'info', 3000);  // 3秒后消失
```

#### 加载组件 (Loading)

```javascript
// 创建加载旋转器（量子美学双环）
createSpinner({ size: 'md', type: 'spinner' });  // spinner | dots | pulse | wave

// 创建加载容器
createLoadingContainer({ text: '加载中...', spinnerType: 'spinner' });

// 全局加载指示器
showGlobalLoading('处理中...');
hideGlobalLoading();

// 骨架屏
createSkeleton({ type: 'text', lines: 3 });  // text | avatar | button

// 进度条
createProgress({ value: 60, striped: true, animated: true });
```

#### 消息组件 (Message)

```javascript
// 增强版消息（带渐变、滑入动画）
showMessage('操作成功', {
  type: 'success',      // success | error | warning | info
  duration: 3000,       // 自动关闭时长（0 为不自动关闭）
  position: 'top-right', // top-right | top-left | top-center | bottom-*
  closable: true        // 显示关闭按钮
});

// 便捷方法
message.success('成功！');
message.error('出错了');
message.warning('请注意');
message.info('提示信息');

// 确认对话框
const confirmed = await message.confirm({
  title: '确认删除',
  message: '确定要删除这个项目吗？',
  confirmText: '删除',
  cancelText: '取消',
  confirmVariant: 'danger'
});
if (confirmed) {
  // 执行删除
}
```

#### 输入框组件 (Input)

```javascript
// 基础输入框
createInput({
  type: 'text',
  placeholder: '请输入...',
  value: '',
  size: 'md',
  disabled: false
});

// 带图标的输入框
createInput({
  placeholder: '搜索...',
  icon: '<svg>...</svg>',
  iconRight: null
});
```

#### yi 组件别名

为了兼容 YiWeb 项目的命名习惯，提供以下别名：

```javascript
import {
  yiButton,   // = createButton
  yiTag,      // = createTag
  yiModal,    // = createModal
  yiLoading,  // = createSpinner
  yiAlert     // = createAlert
} from '/shared/components/index.js';
```

---

## Mermaid 组件使用方法

### 方式一：ES Module（推荐）

```javascript
import { initUnifiedMermaid } from '/shared/mermaid/index.js';

// 初始化
const { renderer, ui } = initUnifiedMermaid({
  debug: false,
  uiOptions: {
    downloadFilename: 'my-diagram'
  }
});

// 渲染图表
renderer.renderDiagram('diagram-id', `
  flowchart TD
    A[开始] --> B[步骤]
    B --> C[结束]
`);
```

### 方式二：全局版本（兼容旧项目）

```html
<!-- 引入全局版本 -->
<script src="/shared/mermaid/global.js"></script>

<script>
  // 初始化
  UnifiedMermaid.init();

  // 渲染图表
  UnifiedMermaid.Renderer.renderDiagram('diagram-id', `
    flowchart TD
      A[开始] --> B[步骤]
  `);

  // 使用 UI 功能
  UnifiedMermaid.Ui.copyCode('diagram-id');
  UnifiedMermaid.Ui.downloadSvg('diagram-id');
</script>
```

### 在 Marked.js 中使用

```javascript
import { renderMermaidCodeBlock } from '/shared/mermaid/index.js';

marked.setOptions({
  renderer: {
    code: function(code, lang) {
      const html = renderMermaidCodeBlock(code, lang, {
        showHeader: true,
        showActions: true
      });
      if (html) return html;

      // 其他语言处理...
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
  }
});
```

---

## 宠物主题色

5 种预设宠物主题色：

```css
--pet-color-1: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
--pet-color-2: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
--pet-color-3: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%);
--pet-color-4: linear-gradient(135deg, #22c55e 0%, #10b981 50%, #059669 100%);
--pet-color-5: linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #a855f7 100%);
```

---

## 项目迁移指南

### YiWeb

1. 替换 `src/styles/base/theme.css` 为 `shared/styles/theme.css`
2. 替换 `src/markdown/mermaid/` 下的文件为 `shared/mermaid/`
3. 更新引用路径

### YiH5

1. 引入 `shared/styles/theme.css`
2. 更新 `src/utils/markdown.js` 中的 Mermaid 初始化使用统一配置
3. 引入 `shared/mermaid/global.js`

### YiPet

1. 更新 `src/config.js` 中的颜色使用主题变量
2. 更新 `src/features/mermaid/` 使用统一组件
