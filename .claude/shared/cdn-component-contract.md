# CDN 组件开发契约

> 本文件定义 YiWeb CDN SPA 的共享组件开发规范，作为 `architect`、`code-reviewer` 和 `implement-code` 的共享解释层。

## 1. 什么放 CDN，什么放 src/views

| 类型 | 存放位置 | 判断标准 |
|------|---------|---------|
| 跨应用共享组件 | `cdn/components/` | 至少 2 个应用需要使用 |
| 应用特有组件 | `src/views/<app>/components/` | 只在单个应用中使用 |
| 通用工具函数 | `cdn/utils/` | 不依赖任何特定应用的 Store |
| 应用特有工具 | `src/views/<app>/utils/` | 依赖特定应用的 hooks |

**禁止**：在 `src/views/` 中定义跨应用共享组件（必须提升到 `cdn/`）。

## 2. CDN 组件三文件结构

每个 CDN 组件遵循三文件结构：

```
cdn/components/<分类>/<组件名>/
├── index.js       # 组件逻辑（必须）
├── template.html  # 组件模板（必须）
└── index.css      # 组件样式（可选）
```

### index.js 规范

组件逻辑使用 Options API + `registerGlobalComponent`：

```javascript
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
import { logInfo } from '/cdn/utils/core/log.js';

registerGlobalComponent({
    name: 'YiButton',
    html: '/cdn/components/common/buttons/YiButton/template.html',
    css: '/cdn/components/common/buttons/YiButton/index.css',

    props: {
        variant: { type: String, default: 'primary' },
        disabled: { type: Boolean, default: false }
    },
    emits: ['click'],

    computed: {
        buttonClass() {
            return `yi-btn yi-btn--${this.variant}`;
        }
    },
    methods: {
        handleClick(event) {
            if (!this.disabled) {
                this.$emit('click', event);
            }
        }
    }
});
```

### template.html 规范

模板使用标准 HTML，通过 Vue 模板语法绑定：

```html
<button :class="buttonClass" :disabled="disabled" @click="handleClick">
    <slot></slot>
</button>
```

### index.css 规范

样式使用 BEM 命名，类名以 `yi-` 前缀：

```css
.yi-btn { ... }
.yi-btn--primary { ... }
.yi-btn--secondary { ... }
```

## 3. Barrel Export 规范

所有 CDN 组件必须在 `cdn/components/index.js` 中 export：

```javascript
export { default as YiButton } from './common/buttons/YiButton/index.js';
export { default as YiModal } from './common/modals/YiModal/index.js';
```

**禁止**：在 barrel export 中遗漏任何已开发的 CDN 组件。

## 4. 组件分类约定

| 分类 | 路径 | 说明 |
|------|------|------|
| 通用按钮 | `cdn/components/common/buttons/` | YiButton, YiIconButton |
| 通用表单 | `cdn/components/common/forms/` | YiInput, YiSelect, YiCheckbox |
| 通用弹窗 | `cdn/components/common/modals/` | YiModal, YiDialog |
| 通用数据展示 | `cdn/components/common/data-display/` | YiTable, YiTooltip |
| 通用反馈 | `cdn/components/common/feedback/` | YiLoading, YiEmptyState |
| 业务组件 | `cdn/components/business/` | 业务特有组件 |

## 5. 与 createBaseView 的衔接

应用视图在 `createBaseView` 的 `components` 参数中列出需要加载的组件名：

```javascript
const app = await createBaseView({
    components: ['AicrPage', 'AicrHeader', 'YiModal', 'YiButton'],
    // ...
});
```

`createBaseView` 会自动加载这些组件的 HTML、CSS 和 JS。

## 6. 安全执行与错误处理

CDN 组件内部必须使用 `safeExecute` 包装异步操作：

```javascript
import { safeExecute } from '/cdn/utils/core/error.js';

methods: {
    async loadData() {
        return safeExecute(async () => {
            const data = await fetchData();
            this.items = data;
        }, '加载数据');
    }
}
```

## 7. 检查清单

开发 CDN 组件时，请确认：

- 组件在 `cdn/components/<分类>/` 下，不在 `src/views/` 下
- 三文件结构完整（index.js + template.html + index.css）
- 在 `cdn/components/index.js` 中已 barrel export
- 类名使用 `yi-` BEM 前缀
- 异步操作使用 `safeExecute` 包装
- Props 使用对象语法（含 type 和 default）
- Events 通过 `$emit` 发送，不在组件内部直接修改父级状态