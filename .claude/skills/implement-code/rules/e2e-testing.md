# E2E 测试规范

> 本规范约束 implement-code 技能在**阶段 1（测试先行）**以及**阶段 2 / 阶段 6（Playwright-MCP 验证）**中的全部测试行为。  
> 阶段编号与阶段职责以 `../SKILL.md` 和 `./orchestration.md` 为准。

---

## 1. 核心约束（P0 — 不可违反）

| 编号 | 约束 |
|------|------|
| E0-1 | 每个用户故事场景 **必须** 对应一个 `*.spec.ts` 文件，不得多个场景共享一个文件（除非场景间有显式的前置依赖）。 |
| E0-2 | 所有可交互 UI 元素 **必须** 标记 `data-testid`，格式：`data-testid="<功能名>-<元素名>"`，如 `data-testid="toolbar-download-btn"`。 |
| E0-3 | 断言 **必须** 来自动态检查清单的预期结果，不得自行发明断言。 |
| E0-4 | 凡场景涉及 API 请求，**必须** 在 `.spec.ts` 中使用 `page.route` 声明 mock（含成功路径 + 至少一个失败路径），不得依赖真实后端。 |
| E0-5 | 测试文件路径必须为 `tests/e2e/<功能名>/<场景名>.spec.ts`，不得任意放置。 |
| E0-6 | **Mock 仅限测试文件**：`page.route`、`vi.mock`、stub 函数等 **只允许出现在 `tests/` 目录**；生产代码禁止出现条件性 mock 逻辑。 |
| E0-7 | 测试场景必须还原项目真实复杂度，**禁止**使用单步骤、无状态变化的过度简化场景。 |
| E0-8 | 所有测试辅助产物（原型 HTML、fixtures、mock 数据、截图、下载文件、快照、临时调试页面）**必须**生成在 `tests/` 下；任何落在 `tests/` 外的测试文件都视为 P0 门禁失败。 |

---

## 2. 文件结构

所有测试产物必须放在 `tests/` 目录内，禁止在项目根目录或 `src/` 下散落测试相关文件。
该规则覆盖 agent 生成、MCP 导出、脚本下载和人工补充的全部测试文件；若第三方工具默认写入 `.playwright-mcp/`、项目根目录或其他临时目录，必须改用 `tests/` 下路径或在进入下一阶段前迁移并记录。

```
tests/
├── e2e/
│   └── <功能名>/
│       ├── <场景名-1>.spec.ts        # Playwright 测试（含 page.route API mock）
│       ├── <场景名-2>.spec.ts
│       ├── fixtures/                  # 共享 mock 数据（可选）
│       │   └── <功能名>-mock-data.ts
│       └── pages/                     # 原型测试页面（阶段 1 产物，阶段 6 后可删除）
│           ├── <场景名-1>/
│           │   └── index.html         # 单场景原型页（复杂场景可拆子页）
│           └── <场景名-2>/
│               └── index.html
├── screenshots/                       # Playwright-MCP 冒烟截图归档（自动生成）
│   └── <功能名>/
│       ├── <场景名>-initial.png       # 初始状态截图
│       ├── <场景名>-after-action.png  # 操作后截图
│       └── <场景名>-error.png         # 错误分支截图（如有）
├── snapshots/                         # Playwright 快照基准（toHaveScreenshot 基准图）
│   └── <功能名>/
│       └── <场景名>-1.png
└── downloads/                         # 测试中触发下载的文件落地目录
    └── <功能名>/
        └── <文件名>.png / .svg / ...
```

**各目录用途说明**

| 目录 | 用途 | 生命周期 |
|------|------|---------|
| `e2e/<功能名>/` | spec 测试文件 + fixtures | 长期保留 |
| `e2e/<功能名>/pages/` | 阶段 1 原型 HTML 页面 | 阶段 6 冒烟测试通过后可删除 |
| `screenshots/` | MCP `browser_snapshot` 输出的截图，用于实施总结和问题溯源 | 按功能归档，可按需清理 |
| `snapshots/` | `toHaveScreenshot` 基准图（视觉回归测试） | 随代码提交，基准变更时需更新 |
| `downloads/` | 测试触发文件下载的落地路径，需在 `playwright.config` 中配置 `downloadsPath` | 每次测试前清空 |

**路径规范**

- `screenshots/` 中的文件名格式：`<场景名>-<状态描述>.png`，状态描述使用英文小写（如 `initial`、`after-hover`、`fullscreen`、`error`）
- `downloads/` 路径在 `playwright.config.ts` 中统一配置：`downloadsPath: 'tests/downloads'`
- `traces/` 路径在 `playwright.config.ts` 中显式配置：`use: { trace: 'on-first-retry' }`，输出根目录通过 `outputDir: 'tests/traces'` 指定
- 所有目录均通过 `.gitignore` 控制提交策略：`screenshots/`、`downloads/`、`traces/`、`tmp/` 默认忽略；`snapshots/` 提交基准图
- Playwright-MCP 默认会写入 `.playwright-mcp/`：阶段退出前必须重定向到 `tests/screenshots/<功能名>/` 或在意外落地时迁移；不得把 `.playwright-mcp/` 当作长期路径
- 阶段 1 / 2 / 6 退出前必须执行 `artifact-contracts.md §2.2 测试路径门禁扫描命令`，命中非空属于 P0 阻断；扫描记录、命中清单、处置结果必须写入 `06_实施总结.md` 的「验证门禁结果归档 § 测试路径门禁」小节，并在 wework-bot 通知的 `📁 测试路径` 行写入最终结论

---

## 3. 真实复杂场景构建要求

### 3.1 复杂度维度检查（生成前必须逐项确认）

| 维度 | 要求 | 示例 |
|------|------|------|
| **异步状态** | 覆盖 加载中 → 成功 / 加载中 → 失败 完整状态机 | 点击导出后显示 loading，成功后显示下载链接，失败后显示错误提示 |
| **多步骤流程** | 步骤间有数据依赖或状态依赖 | 用户填写表单 → 提交 → 收到确认码 → 输入确认码 → 完成 |
| **错误分支** | 涵盖 API 失败（4xx/5xx）、网络超时、输入校验失败 | 导出接口 500 错误时工具栏显示"导出失败，请重试"并恢复按钮状态 |
| **边界条件** | 空状态、最大长度、并发操作、重复触发 | 图表为空时禁用导出按钮；连续快速点击不触发多次请求 |
| **交互副作用** | 操作后影响其他 UI 区域的状态 | 导出成功后历史记录列表新增一条；按钮进入 disabled 状态直到完成 |

### 3.2 Mock 数据真实性要求

Mock 响应体必须：
- **字段名与真实接口一致**（来自设计文档的接口规范）
- **数据类型正确**（不用 `"string"` 代替 URL，不用 `0` 代替有意义的数字）
- **包含真实业务含义的值**（文件名、用户名等使用合理的测试数据）

```typescript
// ✅ 正确：真实数据结构
const mockExportResponse = {
  id: 'export-abc123',
  url: 'https://cdn.example.com/exports/architecture-2024.svg',
  filename: 'architecture-2024.svg',
  size: 48320,
  format: 'svg',
  createdAt: '2024-01-15T10:30:00Z',
  expiresAt: '2024-01-16T10:30:00Z'
};

// ❌ 禁止：无意义占位数据
const mockExportResponse = {
  id: 'test',
  url: 'http://test.com',
  filename: 'test.svg',
  size: 0
};
```

---

## 4. 测试文件模板（`.spec.ts`）

```typescript
import { test, expect } from '@playwright/test';

// 场景：<场景名>
// 来源：需求任务 US-{N} / 动态检查清单 <检查项编号>
// 复杂度维度：异步状态 / 错误分支 / 多步骤流程（列出覆盖的维度）
//
// 【项目场景锚点 - 必须与 test-page.md 头注释一致】
// 入口 URL  : <项目具体路由，如 http://localhost:8080/docs/example.md>
// 前置内容  : <页面需要存在的具体数据/内容，如"含 mermaid 代码块的页面">
// 触发路径  : <从 goto 到场景触发的操作序列，如"等待渲染 → hover .mermaid">
// 可观测对象: <断言所用 data-testid 列表>
//
// ⚠️ 禁止：page.goto('/') 等无意义占位路由；前置内容不得写"某个页面"等泛化描述

// --- Mock 数据定义（只在此测试文件中存在）---
const mockSuccessResponse = {
  // 使用与真实接口一致的完整数据结构
};

const mockErrorResponse = {
  error: 'Service unavailable',
  code: 'EXPORT_FAILED'
};

test.describe('<功能名> - <场景名>', () => {
  test.beforeEach(async ({ page }) => {
    // 前置条件（项目真实场景）：<来自需求任务，描述具体页面内容和状态>
    // 例：打开包含 mermaid 代码块的 Markdown 文档页面，等待图表渲染完成
    await page.goto('<项目具体路由 - 不得使用占位符>');

    // API Mock 注入（仅在测试中！）
    await page.route('**/api/exact/path', async route => {
      const request = route.request();
      // 可根据请求参数返回不同响应
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuccessResponse)
      });
    });
  });

  test('成功路径：<预期结果描述>', async ({ page }) => {
    // === 前置状态验证 ===
    await expect(page.locator('[data-testid="<功能名>-<按钮>"]')).toBeEnabled();

    // === 操作步骤（按需求任务顺序） ===
    await page.click('[data-testid="<功能名>-<按钮>"]');

    // === 异步等待（禁止 waitForTimeout）===
    await expect(page.locator('[data-testid="<功能名>-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="<功能名>-result"]')).toBeVisible();

    // === 断言（必须对应动态检查清单预期结果）===
    await expect(page.locator('[data-testid="<功能名>-result-url"]'))
      .toHaveText(/https:\/\/cdn\.example\.com/);
  });

  test('失败路径：API 错误时显示错误提示', async ({ page }) => {
    // 覆盖成功 mock，改为失败响应
    await page.route('**/api/exact/path', route =>
      route.fulfill({ status: 500, body: JSON.stringify(mockErrorResponse) })
    );

    await page.click('[data-testid="<功能名>-<按钮>"]');

    await expect(page.locator('[data-testid="<功能名>-error-msg"]')).toBeVisible();
    await expect(page.locator('[data-testid="<功能名>-error-msg"]'))
      .toContainText('导出失败');
    // 验证按钮恢复可用（可重试）
    await expect(page.locator('[data-testid="<功能名>-<按钮>"]')).toBeEnabled();
  });

  test('边界条件：<边界场景描述>', async ({ page }) => {
    // 边界场景验证
  });
});
```

---

## 5. Playwright-MCP 验证流程（阶段 2 / 6）

阶段 2 和阶段 6 的门禁验证都使用 Playwright-MCP 工具按以下流程执行：

```
对每个 P0 检查项：
  1. browser_navigate    → 导航至原型页面 URL
  2. browser_snapshot    → 确认初始状态（截图 + DOM 快照）
  3. （若有 API 依赖）   → 通过 page.route 注入 mock 后再操作
  4. browser_click /
     browser_fill /
     browser_select_option → 执行操作步骤
  5. browser_snapshot    → 截取操作后状态
  6. browser_evaluate    → 执行 expect 断言逻辑
  7. 记录：✅ 通过 / ❌ 失败（含 MCP 截图描述）
```

**MCP 验证的额外要求**：
- 每次 `browser_snapshot` 后必须对照动态检查清单的预期描述进行人工语义比对
- API Mock 注入后必须用 `browser_evaluate` 确认 `page.route` 已生效（检查 fetch 是否被拦截）
- 失败时记录 MCP 工具调用序列，供修复参考

---

## 6. 选择器策略（优先级从高到低）

1. `[data-testid="<功能名>-<元素名>"]` ← **强制首选**
2. 语义标签：`button[type="submit"]`、`input[type="checkbox"]`
3. ARIA 角色：`role=dialog`、`role=alert`
4. 文本内容（`getByText`）← 仅用于只读断言，不用于操作
5. CSS 类 / XPath ← **禁止使用**

---

## 7. API Mock 策略

| 依赖类型 | Mock 方式 | 位置约束 |
|---------|----------|---------|
| HTTP API（成功路径） | `page.route('**/api/path', route => route.fulfill({...}))` | 仅 `tests/` 目录 |
| HTTP API（失败路径） | `page.route` 返回 4xx/5xx 状态码 | 仅 `tests/` 目录 |
| HTTP API（网络超时） | `page.route` 使用 `route.abort('timedout')` | 仅 `tests/` 目录 |
| 文件系统操作 | 桩函数（在测试原型页面中内联） | 仅原型页面 |
| 浏览器 API（如 `URL.createObjectURL`） | `page.addInitScript(...)` 注入 | 仅 `.spec.ts` 文件 |
| 时间依赖 | `page.clock.set(...)` | 仅 `.spec.ts` 文件 |
| 共享 Mock 数据 | `tests/e2e/<功能名>/fixtures/<名称>-mock-data.ts` | 仅 `tests/` 目录 |

**Mock 覆盖完整性要求**：每个 API 接口的 mock 必须覆盖：
- ✅ 正常响应（2xx + 完整数据结构）
- ✅ 服务端错误（5xx）
- ✅ 客户端错误（4xx，如 403 权限不足、404 资源不存在）
- ✅ 网络层失败（连接超时、abort）（若场景要求展示离线提示）

---

## 8. Mock 隔离检查（code-review 阶段必查）

在阶段 5 代码评审时，必须执行以下 grep 检查确保 Mock 未泄漏到生产代码：

```bash
# 检查生产代码目录（排除 tests/ 目录）是否含 mock 相关代码
rg -n "vi\.mock|jest\.mock|page\.route|__mocks__|stub\(|mock\(" src/ --type ts
rg -n "import\.meta\.env\.TEST\|process\.env\.TEST\|VITE_MOCK" src/ --type ts

# 期望结果：无匹配（0 条结果）
```

任何匹配都是 P0 问题，必须在进入阶段 5 前修复。

---

## 9. 阶段 1 原型页面专项规范

原型页面（`tests/e2e/<功能名>/pages/<场景名>/index.html`）要求：

1. **最小化**：只包含该场景需要的 UI 元素，不引入完整应用框架。
2. **data-testid 完整**：每个操作步骤涉及的元素均已标记。
3. **可独立打开**：`file://` 协议或本地 dev server 均可访问，不依赖路由守卫。
4. **桩行为覆盖完整状态**：包含加载中、成功、失败三种状态的 UI 切换逻辑。
5. **无 fetch 调用**：原型页面内不得发出真实网络请求，用内联 JS 模拟异步状态切换。
6. **标注来源**：页面顶部注释说明对应的用户故事和检查清单章节。

---

## 10. 一次性成功率提升要点

- **生成测试前**：先读取设计文档中的接口规范，复制真实响应结构作为 mock 数据基础。
- **生成 Mock 前**：确认 `page.route` 的 URL pattern 与接口规范的路径精确匹配（含 query 参数模式）。
- **生成断言前**：逐字比对动态检查清单的"预期结果"，不意译、不简化。
- **运行前**：确认 `playwright.config.*` 中 `baseURL` 已配置，测试文件中不硬编码端口。
- **MCP 验证前**：先用 `browser_snapshot` 确认页面已正确加载，再开始操作步骤。

---

## 11. 禁止事项

- ❌ 在 E2E 测试中 import 项目源码（如 `import { useStore } from '@/stores/...'`）
- ❌ 测试间共享 `page` 对象或全局状态
- ❌ 使用 `page.waitForTimeout(N)` 等待固定时间，改用 `page.waitForSelector` 或 `expect(...).toBeVisible()`
- ❌ 断言 DOM 结构细节（如子元素数量）而非业务语义（如"下载按钮已启用"）
- ❌ 阶段 1 / 2 测试中访问真实 API（全部 mock）
- ❌ Mock 数据使用 `{}` / `"test"` / `0` 等无意义占位符
- ❌ 生产代码中出现 mock/stub/route 相关代码
- ❌ 在 `tests/` 目录以外生成测试文件、原型页、fixtures、mock 数据、截图、下载结果、trace、HAR 或调试 HTML
- ❌ 让 Playwright-MCP 长期使用 `.playwright-mcp/` 默认路径而不重定向到 `tests/screenshots/<功能名>/`
- ❌ 阶段退出前未执行 `artifact-contracts.md §2.2` 测试路径门禁扫描命令，或扫描结果未写入 `06_实施总结.md`
- ❌ 只测试成功路径，不覆盖失败分支
- ❌ `page.goto` 使用泛化占位路由（如 `/`、`/test`、`/path/to/feature`），必须是项目中真实存在的页面路由
- ❌ `beforeEach` 前置条件仅写"打开页面"，必须说明页面上需要存在的具体内容（如文件内容、数据状态）
- ❌ 场景锚点（入口 URL / 前置内容 / 触发路径 / 可观测对象）四项有任一未填写或仍为模板占位符
