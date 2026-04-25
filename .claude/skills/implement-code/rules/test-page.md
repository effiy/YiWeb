# 测试原型页面规范

> 本规范约束 implement-code 阶段 1 中生成的**测试原型页面**（`tests/e2e/<功能名>/pages/`）的结构与内容要求。  
> 测试原型页面的目的：**在零业务代码的情况下，让 Playwright 能够验证 UI 交互方案是否可行**。

---

## 1. 核心约束（P0）

| 编号 | 约束 |
|------|------|
| T0-1 | 每个场景 **必须** 有独立的原型页面目录，文件固定为 `pages/<场景名>/index.html`。 |
| T0-2 | 页面 **必须** 包含动态检查清单中该场景所有 P0 操作步骤涉及的 UI 元素。 |
| T0-3 | 所有可交互元素 **必须** 带 `data-testid`，命名格式：`<功能名>-<元素描述>`，全小写，连字符分隔。 |
| T0-4 | 页面 **必须** 可通过 `file://` 协议或 `localhost` 访问（不依赖登录、路由守卫）。 |
| T0-5 | 页面顶部 **必须** 有注释说明对应的用户故事编号和动态检查清单章节。 |
| T0-6 | 原型页面完整路径 **必须** 是 `tests/e2e/<功能名>/pages/<场景名>/index.html`；禁止生成到 `docs/`、项目根目录、`.playwright-mcp/` 或 `src/`。 |

---

## 2. 文件模板

文件必须保存为：

```text
tests/e2e/<功能名>/pages/<场景名>/index.html
```

```html
<!DOCTYPE html>
<!--
  测试原型页面
  功能：<功能名>
  场景：<场景名>
  对应用户故事：US-{N}
  对应检查清单：05_动态检查清单.md § <章节名>
  生成时间：<ISO 日期>

  【项目场景锚点 - 冒烟测试导航依据】
  入口 URL  : <项目中的具体页面路由或本地文件路径，如 http://localhost:8080/docs/example.md>
  前置内容  : <页面上必须存在的具体数据/内容，如"含至少一个 mermaid 代码块的 Markdown 文件">
  触发路径  : <从入口到场景触发的操作序列，如"打开页面 → 等待渲染 → 鼠标悬停到 .mermaid 容器">
  可观测对象: <断言时所观测的 data-testid 列表，如 mermaid-toolbar-container, mermaid-download-btn>
-->
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[原型] <功能名> - <场景名></title>
  <style>
    /* 最小样式，仅保证元素可见可操作 */
    body { font-family: sans-serif; padding: 20px; }
    [data-testid] { /* 调试用：高亮 testid 元素 */ outline: 1px dashed #ccc; }
    .hidden { display: none; }
  </style>
</head>
<body>

  <!-- 场景前置状态描述 -->
  <!-- 前置条件：<来自需求任务> -->

  <!-- 主要操作区域 -->
  <div data-testid="<功能名>-container">

    <!-- 操作步骤 1 对应的元素 -->
    <button data-testid="<功能名>-<动作描述>-btn" type="button">
      <操作文案>
    </button>

    <!-- 操作步骤 2 对应的元素（若有输入） -->
    <input
      data-testid="<功能名>-<字段名>-input"
      type="text"
      placeholder="<提示文案>"
    />

    <!-- 操作结果区域（断言目标） -->
    <div data-testid="<功能名>-result" class="hidden">
      <预期结果文案占位>
    </div>

    <!-- 错误/提示状态 -->
    <div data-testid="<功能名>-error-msg" class="hidden" role="alert">
      <错误提示占位>
    </div>

  </div>

  <script>
    // 桩行为：模拟操作步骤的状态变更
    // 规则：只做 show/hide/update text，不含业务计算逻辑
    document.querySelector('[data-testid="<功能名>-<动作描述>-btn"]')
      ?.addEventListener('click', () => {
        document.querySelector('[data-testid="<功能名>-result"]')
          ?.classList.remove('hidden');
      });
  </script>

</body>
</html>
```

---

## 3. 元素命名规范（data-testid）

| 元素类型 | 命名模式 | 示例 |
|---------|---------|------|
| 容器 | `<功能名>-container` | `toolbar-container` |
| 主操作按钮 | `<功能名>-<动词>-btn` | `toolbar-download-btn` |
| 次操作按钮 | `<功能名>-<动词>-<名词>-btn` | `toolbar-copy-link-btn` |
| 输入框 | `<功能名>-<字段名>-input` | `toolbar-filename-input` |
| 下拉选择 | `<功能名>-<字段名>-select` | `toolbar-format-select` |
| 结果区域 | `<功能名>-result` | `toolbar-result` |
| 错误提示 | `<功能名>-error-msg` | `toolbar-error-msg` |
| 加载状态 | `<功能名>-loading` | `toolbar-loading` |
| 弹窗/对话框 | `<功能名>-<名称>-dialog` | `toolbar-confirm-dialog` |
| 列表项 | `<功能名>-<列表名>-item-{index}` | `toolbar-history-item-0` |

---

## 4. 桩行为约束

**允许**：
- `element.classList.add/remove('hidden')`
- `element.textContent = '...'`
- `element.disabled = true/false`
- `element.setAttribute('aria-expanded', 'true')`

**禁止**：
- `fetch(...)` 或 `XMLHttpRequest`（一律用 mock 数据内联）
- 引入 Vue / React 等框架（保持纯 HTML + 原生 JS）
- 复杂的业务计算逻辑（超过 10 行的函数需要用注释替代说明意图）

---

## 5. 可访问性要求

- 对话框/弹窗使用 `role="dialog"` 和 `aria-modal="true"`
- 错误提示使用 `role="alert"`
- 按钮使用 `<button>` 标签，不用 `<div>` 模拟
- 图标按钮必须有 `aria-label`

---

## 6. 检查清单（生成测试页面后自检）

- [ ] 每个操作步骤的 UI 元素存在且有正确的 `data-testid`
- [ ] `data-testid` 命名符合规范（无大写、无空格）
- [ ] 桩行为可触发（点击/输入 → 状态变更可见）
- [ ] 页面顶部注释包含用户故事编号和检查清单章节
- [ ] 页面可通过 `file://` 打开无 JS 报错
- [ ] 元素在初始状态下符合前置条件描述（如"下载按钮默认禁用"）
- [ ] 顶部注释中的**项目场景锚点**四项（入口 URL / 前置内容 / 触发路径 / 可观测对象）均已填写，且对应项目真实页面，不含任何泛化占位符
- [ ] 文件路径位于 `tests/e2e/<功能名>/pages/`，且没有在 `tests/` 外留下同类测试页面或调试副本
