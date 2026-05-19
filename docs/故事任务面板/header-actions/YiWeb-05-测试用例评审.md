> | v1.0 | 2026-05-19 | deepseek-v4-pro | 🌿 feat/header-actions | 📎 [../YiWeb-01-故事任务.md](./YiWeb-01-故事任务.md) |

> **来源引用**: 上游 01-故事任务 §5 验收标准 AC1–AC8、§3 成功标准 SC1–SC5。

---

## §1 测试范围

| 维度 | 范围 |
|------|------|
| 测试对象 | HeaderActions 组件渲染、SearchHeader 重构兼容性、storyPanelPage 接入一致性 |
| 测试类型 | 手动验证（浏览器 UI 检查） |
| 涉及层面 | 组件注册、模板渲染、事件冒泡、样式一致性、环境检测 |

---

## §2 手动测试用例

### TC1: HeaderActions 独立渲染

| 项目 | 内容 |
|------|------|
| 关联 AC | AC1、AC2 |
| 前置条件 | HeaderActions 组件已注册 |
| 步骤 | 1. 浏览器打开 aicr 页面<br>2. 检查页面头部右侧操作区<br>3. 确认渲染内容 |
| 预期结果 | 清缓存按钮（旋转箭头图标）和环境徽章（PROD 或 LOCAL）正确渲染；自定义按钮通过插槽显示在清缓存按钮左侧 |
| 优先级 | P0 |

### TC2: 清缓存按钮显隐控制

| 项目 | 内容 |
|------|------|
| 关联 AC | AC1 |
| 前置条件 | 组件 `showClearCache` 属性设为 `false` |
| 步骤 | 1. 在模板中设置 `<header-actions :show-clear-cache="false">`<br>2. 渲染页面 |
| 预期结果 | 清缓存按钮不渲染，其他内容（环境徽章、插槽）正常显示 |
| 优先级 | P1 |

### TC3: 环境徽章检测

| 项目 | 内容 |
|------|------|
| 关联 AC | AC8 |
| 前置条件 | 页面已加载 |
| 步骤 | 1. 在 localhost 访问页面 → 检查环境徽章<br>2. 在非 localhost 域名访问 → 检查环境徽章<br>3. 在 URL 中添加 `?env=local` → 检查环境徽章 |
| 预期结果 | localhost 显示橙色 LOCAL；其他显示绿色 PROD；`?env=local` 强制显示 LOCAL |
| 优先级 | P0 |

### TC4: SearchHeader 重构兼容 — aicr 页面

| 项目 | 内容 |
|------|------|
| 关联 AC | AC3、AC4 |
| 前置条件 | 页面已加载 |
| 步骤 | 1. 打开 aicr 页面<br>2. 检查页面头部的所有操作按钮<br>3. 逐一点击：API 鉴权、侧边栏切换、清缓存刷新<br>4. 打开 DevTools 检查 DOM 结构 |
| 预期结果 | 所有操作按钮与重构前位置、图标、行为完全一致；DOM 中 `<div class="header-actions">` 替换为 `<header-actions>` 组件渲染的 DOM；SearchHeader JS 源码中不含 `detectEnvironment` 函数 |
| 优先级 | P0 |

### TC5: 清缓存刷新端到端

| 项目 | 内容 |
|------|------|
| 关联 AC | AC7 |
| 前置条件 | 页面已加载，浏览器中有缓存数据 |
| 步骤 | 1. 打开 aicr 页面<br>2. 点击「清缓存并刷新」按钮<br>3. 在确认弹窗中点击「确定」<br>4. 页面重载后打开 DevTools → Network 面板 |
| 预期结果 | 清除后执行硬刷新，所有静态资源从服务器重新拉取（Network Size 列无 `disk cache`），URL 含 `_t` 参数 |
| 优先级 | P0 |

### TC6: storyPanel 接入一致性

| 项目 | 内容 |
|------|------|
| 关联 AC | AC5、AC6 |
| 前置条件 | 故事任务面板页面已加载 |
| 步骤 | 1. 打开故事任务面板页面<br>2. 检查页面头部操作区<br>3. 对比与 aicr 页面的清缓存按钮样式<br>4. 点击清缓存按钮<br>5. 检查 CSS 文件 |
| 预期结果 | 清缓存按钮和环境徽章样式与 aicr 页面一致；搜索框和视图切换按钮正常显示在插槽区域；CSS 文件中不含 `.sp-header-right` 和 `.sp-clear-cache-btn` 规则 |
| 优先级 | P0 |

### TC7: 视图切换按钮功能

| 项目 | 内容 |
|------|------|
| 关联 AC | AC5 |
| 前置条件 | 故事任务面板页面已加载，处于看板视图 |
| 步骤 | 1. 点击视图切换按钮<br>2. 检查视图是否切换 |
| 预期结果 | 看板视图切换为列表视图，按钮图标相应变化；再次点击切换回看板视图 |
| 优先级 | P1 |

### TC8: 组件缺失降级

| 项目 | 内容 |
|------|------|
| 关联 AC | — |
| 前置条件 | HeaderActions 组件未注册 |
| 步骤 | 1. 在组件列表中移除 HeaderActions<br>2. 加载使用该组件的页面<br>3. 检查控制台 |
| 预期结果 | Vue 警告组件未注册，页面其他部分正常渲染，不产生 JS 异常导致白屏 |
| 优先级 | P2 |

---

## §3 异常场景测试

### TC9: Vue 不可用

| 项目 | 内容 |
|------|------|
| 前置条件 | `window.Vue` 为 undefined（模拟） |
| 步骤 | 加载 HeaderActions 组件 |
| 预期结果 | 控制台输出 `[HeaderActions] Vue not available on window`，组件返回空对象，不抛出异常 |
| 优先级 | P2 |

### TC10: 环境检测 localStorage 异常

| 项目 | 内容 |
|------|------|
| 前置条件 | localStorage 被禁用或抛异常 |
| 步骤 | 1. 在浏览器中禁用 localStorage<br>2. 加载页面 |
| 预期结果 | localStorage 读取被 try-catch 捕获，降级到 URLSearchParams 检测，环境徽章正常显示 |
| 优先级 | P2 |

---

## §4 回归检查

| ID | 检查项 | 关联模块 |
|----|--------|---------|
| RG1 | aicr 页面搜索功能正常（SearchHeader 搜索框） | SearchHeader |
| RG2 | aicr 页面标签过滤正常（通过 SearchHeader slot 注入） | AicrHeader |
| RG3 | aicr 页面侧边栏折叠/展开正常 | AicrSidebar |
| RG4 | aicr 页面 API 鉴权弹窗正常 | authDialogMethods |
| RG5 | 故事任务面板看板/列表视图切换正常 | storyPanelPage |
| RG6 | 故事任务面板故事搜索过滤正常 | storyPanelPage |
| RG7 | 故事任务面板详情面板打开/关闭正常 | storyDetailCard |
| RG8 | 环境切换后页面正常重载（env badge 点击切换） | config.js |
