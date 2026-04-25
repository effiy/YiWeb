# 代码实施规范

> 本规范约束 implement-code 技能在**阶段 4（写项目代码）**的全部编码行为。  
> 与 `../../generate-document/rules/代码结构.md` 和 `../../generate-document/rules/编码规范.md` 共同作为实施约束，**本规范优先级更高**（因其包含实施流程约束）。

---

## 1. 核心约束（P0）

| 编号 | 约束 |
|------|------|
| C0-1 | **不得在阶段 2 动态检查门禁通过之前写任何项目代码**。 |
| C0-2 | 实施的每一行代码必须可追溯到设计文档的某个模块、接口规范或影响链闭合记录。无来源的代码需注释 `// TODO: 未在设计文档中找到对应规范，待确认`。 |
| C0-3 | 不得新增设计文档中未提及的文件或目录（新增前必须标注原因）。 |
| C0-4 | 实施后 **必须** 运行 ReadLints，P0 lint 错误不得遗留。 |
| C0-5 | 实施后 **必须** 补充 `data-testid` 到真实 UI 组件（与测试页面中的 testid 完全一致）。 |
| C0-6 | 实施后 **必须** 通过阶段 6 冒烟测试（Playwright-MCP 对真实页面的 P0 验证），才能进入阶段 7。 |
| C0-7 | 删除、重命名或修改公共接口前，必须完成全项目上游依赖、反向依赖、传递依赖、导出链、注册链、测试、文档、配置和外部依赖分析；发现同步修改项或阻断项未处理时禁止继续实施。 |

---

## 2. YiWeb 项目专项约束

### 2.1 Store 工厂模式

```javascript
// ✅ 正确：使用工厂函数
export function createXxxStore() {
  // ...
}

// ✅ 正确：在 src/stores/index.js 统一注册
import { createXxxStore } from './xxxStore';
export const useXxxStore = createXxxStore();

// ❌ 错误：直接导出实例
export const xxxStore = reactive({ ... });
```

### 2.2 组件全局注册

```javascript
// ✅ 正确：在 src/components/index.js 注册
import XxxComponent from './XxxComponent.vue';
export default {
  install(app) {
    app.component('XxxComponent', XxxComponent);
  }
};

// ❌ 错误：在使用处局部注册已应全局注册的组件
```

### 2.3 代码结构

遵循 `../../generate-document/rules/代码结构.md`（实施前必须读取）。

---

## 3. 实施顺序

```
1. Store / 状态层
   → 数据模型定义
   → 工厂函数
   → src/stores/index.js 注册

2. 业务逻辑层
   → composables（src/composables/use<功能名>.js）
   → services（若涉及 API）

3. UI 组件层
   → 组件文件（src/components/<功能名>/）
   → 添加 data-testid（必须与测试页面 testid 一一对应）
   → src/components/index.js 注册

4. 路由
   → 若有新页面，在 src/router/index.js 添加路由

5. 入口
   → 确认 main.js / App.vue 引用正确
```

---

## 4. data-testid 移植规则

阶段 2 测试页面中定义的所有 `data-testid` **必须** 原样出现在真实组件中，不得更名或缺省：

```vue
<!-- 测试原型页面中 -->
<button data-testid="toolbar-download-btn">下载</button>

<!-- 真实组件中 — 必须保持完全相同的 testid -->
<button data-testid="toolbar-download-btn" @click="handleDownload">下载</button>
```

移植完成后，对照测试原型页面的元素列表逐一确认。

---

## 5. 静态预检清单（实施前必须全部通过）

- [ ] 设计文档中所有模块的文件路径已确认存在（或为新建）
- [ ] Import 路径中引用的文件/模块均存在
- [ ] `package.json` 中已有或已添加所需依赖
- [ ] TypeScript 类型定义完整（若项目使用 TS）
- [ ] 无循环依赖（尤其 Store ↔ 组件）
- [ ] 环境变量已在 `.env` / `.env.example` 中定义
- [ ] 已读取 `../../../shared/impact-analysis-contract.md`
- [ ] 每个拟改动点已完成全项目影响链闭合分析（搜索词与改动点清单 / 上游依赖 / 反向依赖 / 传递依赖 / 依赖闭合摘要 / 未覆盖风险）

---

## 6. 每模块完成后自检

每完成一个模块的实施，必须：

1. 运行 ReadLints，消除 P0 lint 错误
2. 确认 `data-testid` 完整性
3. 确认模块在 index.js 中已注册
4. 在实施记录中标注"已完成：<模块名>"
5. **全项目范围回归验证**：按 `../../../shared/impact-analysis-contract.md` 对真实 diff 重建搜索词，搜索该模块的上游依赖、反向依赖、传递依赖、导出链、注册链、测试、文档、配置和外部依赖，确认改动无遗漏（与阶段 3 的影响链清单对照，确认所有需同步修改的位置已处理）

---

## 7. 全项目范围影响链分析规范

> **核心意图**：每次代码变更都必须按 `../../../shared/impact-analysis-contract.md` 在整个项目范围内搜索影响面，追踪上游依赖、反向依赖、传递依赖、导出链、注册链、测试、文档、配置和外部依赖，禁止仅凭记忆或设计文档推断引用关系，防止改动遗漏。

### 7.1 分析时机

- 代码编写预检（阶段 3：模块预检）
- 模块完成后自检（本文件第 6 节第 5 项）
- 自修复流程中的修复预检（阶段 4 / 阶段 6 的修复预检）

### 7.2 分析方法

对模块涉及的每个变更点，使用 Grep（ripgrep）对整个仓库进行全量搜索；不得只搜索当前模块目录或 `src/`：

| 变更类型 | 搜索关键词示例 | 搜索范围 |
|---------|--------------|---------|
| 新增/修改组件 | 组件名、组件标签名、import 路径、注册名 | 全仓库业务文件、测试、文档、注册入口 |
| 新增/修改 Store | Store 名、useXxxStore、工厂函数名、state/action/getter key、聚合导出名 | 全仓库业务文件、测试、文档、store index |
| 新增/修改 composable / service | useXxx 名、service 名、import 路径、返回字段名、错误码 | 全仓库业务文件、测试、mock、文档 |
| 新增/修改路由 | 路由 path、路由 name、router-link :to、导航守卫、菜单 / 面包屑 key | 全仓库业务文件、测试、文档、配置 |
| 修改/删除导出 | 原导出名、import { xxx }、barrel export、re-export、default import | 全仓库业务文件、测试、文档、构建入口 |
| 修改事件 / props / payload | 事件名、prop 名、payload 字段、监听方法、provide/inject key | 发送方、监听方、转发组件、测试和文档 |
| 修改样式 token | class 名、CSS 变量、mixin、`@apply`、动态 class 字符串 | 组件、全局样式、文档示例、截图测试 |
| 修改配置 / 环境变量 | key 名、脚本名、别名、插件名、CI 变量 | package scripts、构建配置、CI、文档 |
| 新增/升级外部依赖 | 包名、CDN URL、全局变量名、浏览器 API、MCP / 脚本名 | package、lock 以外的配置、运行脚本、文档、降级方案 |

每个直接命中点还必须继续追踪：

- 是否继续导出或 re-export
- 是否在 `src/stores/index.js`、`src/components/index.js`、路由表、插件入口中注册
- 是否被测试 fixture、mock、E2E、使用文档、动态检查清单、项目报告或实施总结依赖
- 是否作为封装后的二级 API 被其他模块继续调用

### 7.3 产出要求

每个变更点必须产出契约要求的四个部分：搜索词与改动点清单、改动点影响链、依赖闭合摘要、未覆盖风险。实施阶段记录可采用如下精简文本格式，但字段不得缺失：

```
变更项：<组件/Store/composable/路由/导出 名称>
搜索词：<名称 / 路径 / 导出名 / 事件名 / CSS token / 配置 key / 包名>
影响链：
  - <file1>:<line> — 引用方式：<import / 模板引用 / 路由配置 / ...> — 层级：直接 — 依赖方向：上游依赖 / 反向依赖 / 传递依赖 — 处置：同步修改 / 保持兼容 / 补充验证 / 人工复核 / 无需处理 — 闭合状态：已闭合 / 阻断 / 待人工确认
  - <file2>:<line> — 引用方式：<re-export / wrapper / test / docs / ...> — 层级：二级 / 传递 — 依赖方向：<...> — 处置：<...> — 闭合状态：<...>
依赖闭合摘要：
  - 上游依赖：是 / 否 / 不适用
  - 反向依赖：是 / 否 / 不适用
  - 传递依赖：是 / 否 / 不适用
  - 测试 / 文档 / 配置：是 / 否 / 不适用
未覆盖风险：
  - <动态字符串 / 运行时注册 / 第三方约定> — 缓解方式：<人工复核 / 补充测试 / 保持兼容>
```

### 7.4 禁止事项

- ❌ 仅凭设计文档推断引用关系，未使用 Grep 实际搜索
- ❌ 仅搜索当前模块所在目录或 `src/` 目录，未搜索整个项目
- ❌ 只记录直接引用，未继续追踪上游依赖、调用方、导出链、注册链、测试、文档、配置和外部依赖
- ❌ 发现引用处需要同步修改但跳过不处理（必须在实施中同步完成或记录为待处理项）

---

## 8. 禁止事项

- ❌ 在未读取现有相关代码前直接写新代码（可能造成重复实现）
- ❌ 为"让代码更灵活"添加设计文档未要求的配置项
- ❌ 重构未受影响的现有代码
- ❌ 删除设计文档中未提到要删除的现有文件
- ❌ 跳过 data-testid 移植（否则 Playwright 测试无法执行）
- ❌ 在 P0 lint 错误未消除时提交代码或进入下一阶段
- ❌ 冒烟测试（阶段 6）未通过时进入阶段 7
- ❌ 在未完成全项目影响链闭合分析的情况下实施变更（可能造成改动遗漏）
