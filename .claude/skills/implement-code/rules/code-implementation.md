# 代码实施规范

> 本规范约束 implement-code 技能在**阶段 4（写项目代码）**的全部编码行为。
> 与 `../../generate-document/rules/代码结构.md` 和 `../../generate-document/rules/编码规范.md` 共同作为实施约束，**本规范优先级更高**。

---

## 1. 核心约束（P0）

| 编号 | 约束 |
|------|------|
| C0-1 | **不得在阶段 2 动态检查门禁通过之前写任何项目代码**。 |
| C0-2 | 实施的每一行代码必须可追溯到设计文档的某个模块、接口规范或影响链闭合记录。 |
| C0-3 | 不得新增设计文档中未提及的文件或目录（新增前必须标注原因）。 |
| C0-4 | 实施后 **必须** 检查 JS 语法，P0 语法错误不得遗留。 |
| C0-5 | 实施后 **必须** 补充 `data-testid` 到真实 UI 组件（与测试页面中的 testid 完全一致）。 |
| C0-6 | 实施后 **必须** 通过阶段 6 冒烟测试，才能进入阶段 7。 |
| C0-7 | 删除、重命名或修改公共接口前，必须完成全项目影响链闭合分析。 |
| C0-8 | 共享组件必须放在 `cdn/components/` 下，不得放在 `src/views/{app}/components/` 中。 |

---

## 2. YiWeb 项目专项约束

### 2.1 createBaseView 工厂模式

```javascript
// ✅ 正确：使用 createBaseView 初始化应用
import { createStore } from '/src/views/aicr/hooks/store.js';
import { useComputed } from '/src/views/aicr/hooks/useComputed.js';
import { useMethods } from '/src/views/aicr/hooks/useMethods.js';
import { createBaseView } from '/cdn/utils/view/baseView.js';

const app = await createBaseView({
    createStore,
    useComputed,
    useMethods,
    components: ['AicrPage', 'AicrHeader'],
    onMounted: null
});

// ❌ 错误：手动 Vue.createApp 并挂载
```

### 2.2 Hooks 工厂模式

```javascript
// ✅ 正确：使用 hooks 三文件模式
// store.js — 使用 Vue.ref
export function createStore() {
    const { ref } = window.Vue;
    return { sessions: ref([]) };
}

// useComputed.js — 使用 Vue.computed
export function useComputed(store) {
    const { computed } = window.Vue;
    return { activeSessions: computed(() => store.sessions.value.filter(s => s.active)) };
}

// useMethods.js — 组合业务方法
export function useMethods(store) {
    return { async loadSessions() { ... } };
}

// ❌ 错误：直接使用 Vue.reactive
```

### 2.3 CDN 组件注册

```javascript
// ✅ 正确：在 cdn/components/index.js barrel export
export { default as YiButton } from './common/buttons/YiButton/index.js';

// ✅ 正确：使用 registerGlobalComponent 注册
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';
registerGlobalComponent({ name: 'YiButton', html: '...', css: '...' });

// ❌ 错误：在 src/views/ 中定义共享组件
```

### 2.4 代码结构

遵循 `../../generate-document/rules/代码结构.md`（实施前必须读取）。

---

## 3. 实施顺序

```
1. Hooks / 状态层
   → store.js（createStore 工厂函数）
   → useComputed.js
   → useMethods.js

2. CDN 共享组件（若需要跨应用复用）
   → 组件文件（cdn/components/<分类>/<组件名>/）
   → cdn/components/index.js barrel export

3. 应用特有组件
   → 组件文件（src/views/<app>/components/<组件名>/）
   → 添加 data-testid（必须与测试页面 testid 一一对应）

4. 视图入口
   → src/views/<app>/index.js（createBaseView 挂载）

5. 入口确认
   → 确认 index.html 引用正确
```

---

## 4. data-testid 移植规则

阶段 2 测试页面中定义的所有 `data-testid` **必须** 原样出现在真实组件中，不得更名或缺省。

移植完成后，对照测试原型页面的元素列表逐一确认。

---

## 5. 静态预检清单（实施前必须全部通过）

- [ ] 设计文档中所有模块的文件路径已确认存在（或为新建）
- [ ] 共享组件已放在 `cdn/components/` 下
- [ ] 应用特有组件已放在 `src/views/<app>/components/` 下
- [ ] hooks 三文件模式完整（store.js / useComputed.js / useMethods.js）
- [ ] 已读取 `../../../shared/impact-analysis-contract.md`
- [ ] 每个拟改动点已完成全项目影响链闭合分析

---

## 6. 每模块完成后自检

每完成一个模块的实施，必须：

1. 检查 JS 语法，消除 P0 语法错误
2. 确认 `data-testid` 完整性
3. 确认 CDN 组件在 `cdn/components/index.js` 中已 export
4. 确认 createBaseView 参数完整
5. **全项目范围回归验证**：按 `../../../shared/impact-analysis-contract.md` 对真实 diff 重建搜索词，搜索影响链

---

## 7. 禁止事项

- ❌ 在 `src/views/` 中定义跨应用共享组件（必须放 `cdn/components/`）
- ❌ 在未读取现有相关代码前直接写新代码
- ❌ 跳过 hooks 工厂模式直接写 reactive 代码
- ❌ 跳过 data-testid 移植
- ❌ 在 P0 语法错误未消除时进入下一阶段