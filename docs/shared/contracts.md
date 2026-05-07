# YiWeb Contracts

## Module System

- **Import style**: Absolute paths starting with `/`
- **Export style**: ESM `export` + `window.*` global (backward compat)
- **Module types**: ES Modules (native browser `import`/`export`)

## Component Contract

```js
// Registration
registerGlobalComponent('component-name', componentDefinition)

// Usage in templates — globally available
```

## State Management Contract

```js
// Store
const store = createStore(initialState)

// Computed
const computed = useComputed(store, computeFn)

// Methods
const methods = useMethods(store, methodDefs)
```

## Environment Contract

```js
// src/core/config.js — single source of truth
// Override methods:
// 1. URL param: ?env=local
// 2. localStorage: localStorage.setItem('env', 'local')
// 3. Programmatic: window.setEnv('local')
```

## API Base

- Production: `https://api.effiy.cn`
- Local override: via environment config

## Debug Objects

| Object | Purpose |
|--------|---------|
| `window.aicrStore` | AICR state store |
| `window.setEnv()` | Environment switcher |
| `window.__ENV__` | Current environment config |

## Design System

- Reference: `design-system.md`
- Shared theme: `cdn/styles/theme.css`
- CSS custom properties for theming
