# E2E 测试规范

> 本规范约束 implement-code 技能在**阶段 2（E2E 测试页面生成）**和**阶段 4（Playwright 真实测试）**中的全部测试行为。

---

## 1. 核心约束（P0 — 不可违反）

| 编号 | 约束 |
|------|------|
| E0-1 | 每个用户故事场景 **必须** 对应一个 `*.spec.ts` 文件，不得多个场景共享一个文件（除非场景间有显式的前置依赖）。 |
| E0-2 | 所有可交互 UI 元素 **必须** 标记 `data-testid`，格式：`data-testid="<功能名>-<元素名>"`，如 `data-testid="toolbar-download-btn"`。 |
| E0-3 | 断言 **必须** 来自动态检查清单的预期结果，不得自行发明断言。 |
| E0-4 | 阶段 2 生成的测试骨架中，业务逻辑断言 **必须** 使用桩（stub）或 `page.route` mock，不得依赖真实后端。 |
| E0-5 | 测试文件路径必须为 `tests/e2e/<功能名>/<场景名>.spec.ts`，不得任意放置。 |

---

## 2. 文件结构

```
tests/
└── e2e/
    └── <功能名>/
        ├── <场景名-1>.spec.ts
        ├── <场景名-2>.spec.ts
        └── pages/              # 原型测试页面（阶段 2 专用，阶段 4 后可删除）
            ├── <场景名-1>.html
            └── <场景名-2>.html
```

---

## 3. 测试文件模板（`.spec.ts`）

```typescript
import { test, expect } from '@playwright/test';

// 场景：<场景名>
// 来源：需求任务 US-{N} / 动态检查清单 <检查项编号>
test.describe('<功能名> - <场景名>', () => {
  test.beforeEach(async ({ page }) => {
    // 前置条件：<来自需求任务>
    await page.goto('/');
    // mock 外部依赖（若有）
    await page.route('**/api/xxx', route =>
      route.fulfill({ json: { /* stub data */ } })
    );
  });

  test('<预期结果描述>', async ({ page }) => {
    // 操作步骤
    await page.click('[data-testid="<功能名>-<元素名>"]');
    await page.fill('[data-testid="<功能名>-<输入框名>"]', '<测试数据>');

    // 断言（必须对应动态检查清单预期结果）
    await expect(page.locator('[data-testid="<功能名>-<结果元素>"]')).toBeVisible();
  });
});
```

---

## 4. 选择器策略（优先级从高到低）

1. `[data-testid="<功能名>-<元素名>"]` ← **强制首选**
2. 语义标签：`button[type="submit"]`、`input[type="checkbox"]`
3. ARIA 角色：`role=dialog`、`role=alert`
4. 文本内容（`getByText`）← 仅用于只读断言，不用于操作
5. CSS 类 / XPath ← **禁止使用**

---

## 5. Mock 策略

| 依赖类型 | Mock 方式 |
|---------|----------|
| HTTP API | `page.route('**/api/路径', ...)` |
| 文件系统操作 | 桩函数（在测试原型页面中内联） |
| 浏览器 API（如 `URL.createObjectURL`） | `page.addInitScript(...)` 注入 |
| 时间依赖 | `page.clock.set(...)` |

---

## 6. 阶段 2 原型页面专项规范

原型页面（`tests/e2e/pages/<功能名>/<场景名>.html`）要求：

1. **最小化**：只包含该场景需要的 UI 元素，不引入完整应用框架。
2. **data-testid 完整**：每个操作步骤涉及的元素均已标记。
3. **可独立打开**：`file://` 协议或本地 dev server 均可访问，不依赖路由守卫。
4. **桩行为**：交互后的状态变更用内联 JavaScript 模拟（如点击后显示/隐藏元素）。
5. **标注来源**：页面顶部注释说明对应的用户故事和检查清单章节。

---

## 7. 一次性成功率提升要点

- **生成测试前**：先读取设计文档中的 UI 组件结构，确认 `data-testid` 命名不与现有元素冲突。
- **生成断言前**：逐字比对动态检查清单的"预期结果"，不意译、不简化。
- **Mock 前**：确认 `page.route` 的 URL pattern 与实际请求路径完全匹配（可从设计文档的接口规范获取）。
- **运行前**：确认 `playwright.config.*` 中 `baseURL` 已配置，测试文件中不硬编码端口。

---

## 8. 禁止事项

- ❌ 在 E2E 测试中 import 项目源码（如 `import { useStore } from '@/stores/...'`）
- ❌ 测试间共享 `page` 对象或全局状态
- ❌ 使用 `page.waitForTimeout(N)` 等待固定时间，改用 `page.waitForSelector` 或 `expect(...).toBeVisible()`
- ❌ 断言 DOM 结构细节（如子元素数量）而非业务语义（如"下载按钮已启用"）
- ❌ 阶段 2 测试中访问真实 API（全部 mock）
