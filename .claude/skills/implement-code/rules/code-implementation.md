# 代码实施规范

> 本规范约束 implement-code 技能在**阶段 4（写项目代码）**的全部编码行为。
> 与 `../../generate-document/rules/代码结构.md` 和 `../../generate-document/rules/编码规范.md` 共同作为实施约束，**本规范优先级更高**。

---

## 1. 核心约束（P0）

| 编号 | 约束 |
|------|------|
| C0-1 | **不得在阶段 2 动态检查门禁通过之前写任何项目代码**（编码前须满足 [`implement-code-testing.md`](./implement-code-testing.md) Gate A：真实入口 MVP + 可追溯证据）。 |
| C0-2 | 实施的每一行代码必须可追溯到设计文档的某个模块、接口规范或影响链闭合记录。 |
| C0-3 | 不得新增设计文档中未提及的文件或目录（新增前必须标注原因）。 |
| C0-4 | 实施后 **必须** 检查 JS 语法，P0 语法错误不得遗留。 |
| C0-5 | 实施后 **必须** 补充 `data-testid` 到真实 UI 组件（与测试页面中的 testid 完全一致）。 |
| C0-6 | 实施后 **必须** 通过阶段 6 冒烟测试，才能进入阶段 7。 |
| C0-7 | 删除、重命名或修改公共接口前，必须完成全项目影响链闭合分析。 |
| C0-8 | 共享组件与应用组件的分层必须遵循项目现有约定；若无约定，需在设计文档中明确并在实现中保持一致。 |

---

## 2. 项目专项约束（按仓库现状适用）

### 2.1 入口初始化模式

```javascript
// ✅ 正确：遵循项目既有入口初始化方式（示意）
initApp({
    // store: createStore,
    // routes: [...],
    // components: [...]
})
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

// useMethods.js — 组合领域方法
export function useMethods(store) {
    return { async loadSessions() { ... } };
}

// ❌ 错误：直接使用 Vue.reactive
```

### 2.3 共享组件注册/导出

### 2.4 代码结构

遵循 `../../generate-document/rules/代码结构.md`（实施前必须读取）。

---

## 3. 实施顺序

```
1. Hooks / 状态层
   → store.js（createStore 工厂函数）
   → useComputed.js
   → useMethods.js

2. 共享组件（若需要跨应用复用）
   → 组件文件（共享层路径按项目约定）
   → 若使用统一导出入口，确保已导出

3. 应用特有组件
   → 组件文件（应用层路径按项目约定）
   → 添加 data-testid（必须与测试页面 testid 一一对应）

4. 视图入口
   → 项目真实入口文件（按项目约定初始化/挂载）

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
- [ ] 共享组件与应用组件的放置路径已按项目约定确认
- [ ] hooks 三文件模式完整（store.js / useComputed.js / useMethods.js）
- [ ] 已读取 `../../../shared/impact-analysis-contract.md`
- [ ] 每个拟改动点已完成全项目影响链闭合分析

---

## 6. 每模块完成后自检

每完成一个模块的实施，必须：

1. 检查 JS 语法，消除 P0 语法错误
2. 确认 `data-testid` 完整性
3. 确认共享组件/模块的导出与注册方式一致且可被引用
4. 确认入口初始化参数/挂载方式完整
5. **全项目范围回归验证**：按 `../../../shared/impact-analysis-contract.md` 对真实 diff 重建搜索词，搜索影响链

---

## 7. 禁止事项

- ❌ 未确认项目既有结构与约定就擅自引入新的目录骨架/路径约定
- ❌ 在未读取现有相关代码前直接写新代码
- ❌ 跳过 hooks 工厂模式直接写 reactive 代码
- ❌ 跳过 data-testid 移植
- ❌ 在 P0 语法错误未消除时进入下一阶段