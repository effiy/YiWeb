# 状态管理约定

## 核心模式

本项目采用自定义 Store 模式，基于 Vue 3 的 `ref`/`reactive` 构建，不使用 Pinia/Vuex。

### 应用流程

```
createBaseView()
    └── createStore()      → 创建响应式状态
        └── useComputed()  → 计算属性
        └── useMethods()   → 业务方法
```

## Store 结构

### 状态定义（storeState.js）

```javascript
const vueRef = Vue.ref || ((val) => ({ value: val }));

export const createAicrStoreState = (vueRef) => {
    const state = {
        // UI 状态
        sidebarCollapsed: vueRef(false),
        sidebarWidth: vueRef(280),
        chatPanelCollapsed: vueRef(false),
        chatPanelWidth: vueRef(380),
        
        // 数据状态
        sessions: vueRef([]),
        activeSession: vueRef(null),
        fileTree: vueRef([]),
        files: vueRef({}),
        
        // 加载状态
        loading: vueRef(false),
        
        // 搜索
        searchQuery: vueRef(''),
        
        // 视图
        viewMode: vueRef('code'), // 'code' | 'markdown'
    };
    
    return { state, internals: { ... } };
};
```

### 操作方法（Ops 模块）

Store 按功能拆分为独立的 ops 工厂函数：

| 模块 | 职责 |
|------|------|
| `storeSessionsOps.js` | 会话列表加载、创建、删除 |
| `storeFileTreeOps.js` | 文件树构建、展开、重命名、CRUD |
| `storeFileContentOps.js` | 文件内容加载、保存、缓存 |
| `storeUiOps.js` | UI 状态切换（侧边栏、面板、视图模式） |

### 工厂组合（storeFactory.js）

```javascript
export const createStore = () => {
    const { state, internals } = createAicrStoreState(vueRef);
    
    const sessionsOps = createAicrStoreSessionsOps(deps, state);
    const fileContentOps = createAicrStoreFileContentOps(deps, state, internals);
    const fileTreeOps = createAicrStoreFileTreeOps(deps, state, internals, {
        loadSessions: sessionsOps.loadSessions
    });
    const uiOps = createAicrStoreUiOps(state, { loadFileTree, loadFiles });
    
    return {
        ...state,
        ...fileTreeOps,
        ...fileContentOps,
        ...uiOps,
        ...sessionsOps
    };
};
```

## 使用方法

### useComputed

提供基于 store 状态的计算属性：

```javascript
export const useComputed = (store) => {
    const filteredSessions = Vue.computed(() => {
        const query = store.searchQuery.value?.toLowerCase();
        if (!query) return store.sessions.value;
        return store.sessions.value.filter(s => 
            s.name?.toLowerCase().includes(query)
        );
    });
    
    return { filteredSessions };
};
```

### useMethods

提供业务操作方法，按功能拆分为子模块：

```javascript
export const useMethods = (store) => {
    const sessionChatContextMethods = createSessionChatContextMethods({ store, ... });
    const fileTreeCrudMethods = createFileTreeCrudMethods({ store, ... });
    const searchMethods = createSearchMethods({ store, ... });
    const uiEventMethods = createUiEventMethods({ store, ... });
    
    return {
        ...sessionChatContextMethods,
        ...fileTreeCrudMethods,
        ...searchMethods,
        ...uiEventMethods,
    };
};
```

## 状态访问约定

### 在模板中

Store 状态直接绑定到模板，通过 `createBaseView` 的 `data` 选项暴露：

```javascript
createBaseView({
    data: {
        sidebarCollapsed: store.sidebarCollapsed,
        sessions: store.sessions,
        // ...
    }
});
```

模板中使用：
```html
<div :class="{ collapsed: sidebarCollapsed }">
    <span v-for="session in sessions" :key="session.id">
        {{ session.name }}
    </span>
</div>
```

### 在方法中

通过解构 store 获取响应式引用：

```javascript
const { fileTree, loadFiles, activeSession } = store;
// 读取：fileTree.value
// 写入：fileTree.value = newTree
```

## 调试

- 全局暴露：`window.aicrStore`
- 在控制台直接访问：`window.aicrStore.sessions.value`

## Postscript: Future Planning & Improvements

- 考虑为复杂状态添加持久化（localStorage / IndexedDB）
- 评估是否需要引入 Pinia 以获得更好的 devtools 支持
- 分离只读状态和可写状态以提升可维护性
