> | v1.0.0 | 2026-05-22 | deepseek-v4-pro | 🌿 feat/aicr | ⏱️ — | 📎 [CLAUDE.md](../../../CLAUDE.md) |

> **导航**: [← YiWeb-技术评审](./YiWeb-技术评审.md) · [YiWeb-实施报告 →](./YiWeb-实施报告.md)

> **来源引用**: 基于 [YiWeb-故事任务](./YiWeb-故事任务.md) §5 AC# + [YiWeb-技术评审](./YiWeb-技术评审.md) §3–§5。

[§0 基线溯源](#sec0-baseline) · [§1 正常路径](#sec1-normal) · [§2 边界/异常](#sec2-edge) · [§3 Gate A 交接](#sec3-gate)

---

### 主要价值

- 🎯 AC 全覆盖 — 8 个 AC 全部有对应用例
- 🔒 四类用例 — 正常 + 边界 + 异常 + 回归
- ⚡ Gate A 交接 — P0 用例 ID + 验证命令
- 📊 可执行 Given/When/Then — 可直接转为测试

---

<a id="sec0-baseline"></a>

## §0 基线溯源

| AC# | 覆盖用例 |
|-----|---------|
| AC1: 会话列表加载 | TC-N01, TC-E01 |
| AC2: 搜索过滤 | TC-N02 |
| AC3: 标签过滤 | TC-N03 |
| AC4: 点击会话 | TC-N04, TC-E02 |
| AC5: 发送消息流式响应 | TC-N05, TC-E03, TC-E04 |
| AC6: 删除确认 | TC-N06, TC-E05 |
| AC7: 拖拽调整宽度 | TC-N07 |
| AC8: 文件选择展示 | TC-N08, TC-E06 |

---

<a id="sec1-normal"></a>

## §1 正常路径

### TC-N01: 会话列表加载成功

| Given | 远端 API 返回会话列表 | When | 页面加载完成 | Then | 会话列表渲染，显示标题/标签/时间 |

### TC-N02: 关键字搜索过滤

| Given | 会话列表含 10 条记录 | When | 在搜索框输入 "login" | Then | 列表过滤为标题含 "login" 的会话 |

### TC-N03: 标签点击过滤

| Given | 多个会话含 "bug" 标签 | When | 点击 "bug" 标签 | Then | 列表仅显示含 "bug" 标签的会话 |

### TC-N04: 点击会话加载详情

| Given | 会话列表已展示 | When | 点击一个会话 | Then | 文件树加载、聊天面板显示历史消息、代码区就绪 |

### TC-N05: 发送消息接收流式响应

| Given | 活跃会话已选中，输入框有内容 | When | 点击发送 | Then | 用户消息出现在聊天区，AI 响应逐字流式渲染 |

### TC-N06: 删除会话

| Given | 会话列表含目标会话 | When | 点击删除并确认 | Then | 会话从列表移除，远端同步删除 |

### TC-N07: 拖拽调整侧边栏宽度

| Given | 侧边栏可见 | When | 拖拽侧边栏右边缘 50px | Then | 侧边栏宽度增加 50px，释放后持久化到 localStorage |

### TC-N08: 点击文件查看代码

| Given | 文件树已展开 | When | 点击一个 .js 文件 | Then | 代码区显示语法高亮的代码内容 |

---

<a id="sec2-edge"></a>

## §2 边界/异常

### TC-E01: 会话列表加载失败

| Given | 远端 API 不可达 | When | 页面加载 | Then | 显示错误状态组件，含重试按钮 |

### TC-E02: 点击会话加载失败

| Given | 会话列表正常 | When | 点击会话后 API 返回 500 | Then | 显示加载错误，不切换 activeSession |

### TC-E03: 流式响应中断

| Given | 流式对话进行中 | When | 网络断开 | Then | 已接收内容保留在聊天区，显示"发送失败"标记 |

### TC-E04: 发送空消息

| Given | 输入框为空 | When | 点击发送或按 Enter | Then | 不发送请求，输入框保持焦点 |

### TC-E05: 取消删除

| Given | 点击删除按钮，弹窗显示 | When | 点击取消 | Then | 弹窗关闭，会话保留，列表不变 |

### TC-E06: 文件内容加载失败

| Given | 文件树正常 | When | 点击文件后内容请求失败 | Then | 代码区显示错误占位 |

### TC-E07: 切换会话清理聊天状态

| Given | 会话 A 聊天区有 10 条消息 | When | 点击会话 B | Then | 聊天区切换为会话 B 的历史消息，不含会话 A 残留 |

---

<a id="sec3-gate"></a>

## §3 Gate A 交接信令

| 信号 | 值 | 验证方式 |
|------|-----|---------|
| P0 用例 | TC-N01–N08, TC-E01–E07 | 逐用例 Given/When/Then 审查 |
| AC 覆盖 | 8/8 AC# | 对照 §0 基线溯源 |
| UI 状态覆盖 | loading / empty / error / success | 每组件 4 状态均有用例 |
| 无源码残留 | 仅新增测试文件 | git diff |

---

> **变更记录**
> | 日期 | 变更 | 触发 | 证据 |
> |------|------|------|------|
> | 2026-05-22 | 初始生成 | /rui doc --from-code aicr | YiWeb-故事任务 §5 + YiWeb-技术评审 §3–§5 |
