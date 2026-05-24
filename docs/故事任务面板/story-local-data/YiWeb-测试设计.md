> | v1.0.0 | 2026-05-24 | deepseek-v4-pro | 🌿 feat/story-local-data | ⏱️ — | 📎 [CLAUDE.md](../../../CLAUDE.md) |

> **导航**: [← YiWeb-技术评审](./YiWeb-技术评审.md) · [YiWeb-实施报告 →](./YiWeb-实施报告.md)

> **来源引用**: [YiWeb-故事任务 §5](./YiWeb-故事任务.md#sec5-ac) · [YiWeb-使用场景](./YiWeb-使用场景.md) · [YiWeb-技术评审](./YiWeb-技术评审.md)

### 主要价值

- 🧪 覆盖扫描脚本生成端和前端消费端，双向验证数据一致性
- 🔗 每条用例可追溯至故事任务 AC# 和使用场景
- 🚦 Gate A 交接信号明确：P0 用例全部通过方可进入实现
- 🛡️ 异常用例覆盖 manifest 不可用 → API 回退 → 全部失败三级降级

---

## §0 基线溯源

| TC# | 覆盖 AC# (01 §5) | 覆盖场景 (02 §2) | 覆盖类型 | 状态 |
|-----|-------------------|------------------|---------|------|
| TC-N1–N3 | AC1, AC2 | 场景 A 打开面板查看进度 | 正常 | 待执行 |
| TC-N4–N5 | AC3 | 场景 D 降级加载 | 正常 | 待执行 |
| TC-B1–B3 | AC1 | 场景 A, B | 边界 | 待执行 |
| TC-E1–E3 | AC2, AC3 | 场景 A, D | 异常 | 待执行 |
| TC-R1–R2 | AC1–AC4 | 场景 A–D | 回归 | 待执行 |

---

## §1 测试范围

### 1.1 覆盖矩阵

| FP# | 功能点 | 正常 | 边界 | 异常 | 回归 | 覆盖率 |
|-----|--------|------|------|------|------|--------|
| FP1 | 目录扫描 | TC-N1 | TC-B1 | TC-E1 | TC-R1 | 100% |
| FP2 | 状态判定 | TC-N1 | TC-B2 | — | TC-R2 | 100% |
| FP3 | 类型推断 | TC-N1 | TC-B3 | — | TC-R2 | 100% |
| FP4 | 描述提取 | TC-N1 | — | — | TC-R1 | 100% |
| FP5 | Manifest 写入 | TC-N1 | TC-B1 | TC-E1 | TC-R1 | 100% |
| FP6 | Store 改造 | TC-N2, N3 | — | TC-E2 | TC-R2 | 100% |
| FP7 | 降级兼容 | TC-N4, N5 | — | TC-E3 | TC-R2 | 100% |

### 1.2 Gate 映射

| Gate | 用例范围 | 通过标准 | 交接下游 |
|------|---------|---------|---------|
| Gate A | TC-N*, TC-B*, TC-E* 全部 | P0 用例 100% 通过，无阻塞缺陷 | 实现阶段 |
| Gate B | TC-R* 全部 + 冒烟 | P0 全部通过，P1 ≥ 90% 通过 | 交付阶段 |

### 1.3 影响链覆盖

| 影响点 | 来源 | 回归用例 | 覆盖状态 |
|--------|------|---------|---------|
| scan-stories.mjs 扫描逻辑 | FP1, FP2, FP3, FP4, FP5 | TC-R1 | 待执行 |
| store.js fetchFromManifest | FP6 | TC-R2 | 待执行 |
| store.js fetchFromApi 回退 | FP7 | TC-R2 | 待执行 |

---

## §2 测试用例

### 2.1 正常用例 (TC-N*)

| ID | Given | When | Then | 关联 FP | 优先级 |
|----|-------|------|------|---------|--------|
| TC-N1 | `docs/故事任务面板/` 下有 ≥ 3 个故事目录，含完整文档 | 运行 `node scripts/scan-stories.mjs` | 生成 `_manifest.json`，stories 数组非空，每个 story 含 name/status/type/files/description | FP1, FP2, FP3, FP4, FP5 | P0 |
| TC-N2 | `_manifest.json` 可被 web server 正常访问 | 打开 story 页面 | 故事列表正常展示，状态徽章和类型标签正确，无远端 API 调用 | FP6 | P0 |
| TC-N3 | 新故事目录已创建，文档不完整 | 运行扫描脚本 → 刷新页面 | 新故事出现在列表中，状态为 `docs_in_progress`，类型正确 | FP6 | P0 |
| TC-N4 | Manifest 被删除（模拟不可用），远端 API 可用 | 打开 story 页面 | 页面自动回退 API 加载，故事列表正常展示 | FP7 | P1 |
| TC-N5 | Manifest 和 API 均可用 | 打开 story 页面 | 页面优先使用 manifest，不发起 API 请求 | FP6, FP7 | P0 |

### 2.2 边界用例 (TC-B*)

| ID | Given | When | Then | 关联 FP | 优先级 |
|----|-------|------|------|---------|--------|
| TC-B1 | `docs/故事任务面板/` 下无任何故事目录 | 运行扫描脚本 | 生成 manifest，story_count=0，stories 为空数组 | FP1, FP5 | P1 |
| TC-B2 | 某故事仅有 `{project}-故事任务.md`，无其他文档 | 运行扫描脚本 | 该故事 status=`docs_in_progress`，fileCount=1 | FP2 | P1 |
| TC-B3 | 某故事技术评审不存在 | 运行扫描脚本 | 该故事 type=`meta` | FP3 | P1 |

### 2.3 异常用例 (TC-E*)

| ID | Given | When | Then | 关联 FP | 优先级 |
|----|-------|------|------|---------|--------|
| TC-E1 | 扫描脚本对 `docs/故事任务面板/` 无读取权限 | 运行扫描脚本 | 进程 exit code ≠ 0，stderr 输出错误信息 | FP1, FP5 | P0 |
| TC-E2 | `_manifest.json` 不存在且远端 API 不可用 | 打开 story 页面 | 显示错误状态，提供重试按钮 | FP6, FP7 | P0 |
| TC-E3 | `_manifest.json` 内容为无效 JSON | 打开 story 页面 | JSON.parse 失败 → 回退 API；API 可用则正常加载 | FP6, FP7 | P1 |

### 2.4 回归用例 (TC-R*)

| ID | Given | When | Then | 关联 FP | 优先级 |
|----|-------|------|------|---------|--------|
| TC-R1 | 扫描脚本代码修改后 | 运行扫描脚本，对比修改前后 manifest | story_count、各字段结构与修改前一致（无回退） | FP1, FP4, FP5 | P0 |
| TC-R2 | store.js 数据加载路径修改后 | 分别测试 manifest 可用/不可用场景 | 视觉效果与修改前一致（相同组件、状态、标签） | FP2, FP3, FP6, FP7 | P0 |

---

## §3 环境专项

| ID | Given | When | Then | 优先级 |
|----|-------|------|------|--------|
| TC-X01 | 扫描脚本在 Linux 环境运行 | 执行 `node scripts/scan-stories.mjs` | 路径分隔符正确（使用 `path.join`），manifest 路径为 POSIX 格式 | P1 |
| TC-X02 | Manifest 文件编码为 UTF-8 | fetch manifest → 解析 JSON | 中文字段（描述/状态标签）正确渲染，无乱码 | P1 |
| TC-X03 | Web server 配置 CORS / 认证拦截 | fetch manifest | 本地文件 fetch 不触发 CORS 预检；无认证头时仍可访问 | P1 |
| TC-X04 | 并发访问 manifest（多标签页） | 同时打开 3 个 story 页面标签 | 每个标签页独立 fetch manifest，互不影响 | P2 |

---

## §4 测试环境

| 维度 | 配置 |
|------|------|
| 运行环境 | Node.js >= 18（扫描脚本）；现代浏览器 Chrome 90+ / Firefox 90+（前端） |
| 部署方式 | 静态文件服务托管 `docs/` 目录；零构建 ESM 加载 |
| 测试目标 | `scripts/scan-stories.mjs` + `src/views/story/hooks/store.js` |
| 数据准备 | `docs/故事任务面板/` 下有 13 个故事目录（当前状态） |
| 分支 | `feat/story-local-data` |
| 环境快照 | `73f7839` (HEAD) |

---

## §5 评审清单

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 每功能点 ≥ 1 类覆盖（正常/边界/异常/回归） | ✅ FP1–FP7 全部有正常覆盖 |
| 2 | Gate A 覆盖全部 P0 用例 | ✅ TC-N1, N2, N5, TC-E1, TC-E2, TC-R1, TC-R2 |
| 3 | 回归用例与影响链一致 | ✅ 3 个影响点各有回归 |
| 4 | 异常用例含恢复行为 | ✅ TC-E1–E3 均含恢复描述 |
| 5 | 环境专项覆盖完整 | ✅ 跨平台路径、编码、CORS、并发 |
| 6 | 无外部依赖占比合理 | ✅ 依赖本地文件系统和 web server 静态托管 |
| 7 | 影响链每点有回归 | ✅ TC-R1, TC-R2 |
| 8 | 基线溯源闭合 | ✅ §0 全部映射 |

---

## §6 Gate A 交接

| 信号 | 内容 |
|------|------|
| 通过状态 | 待验证 |
| P0 用例 ID | TC-N1, TC-N2, TC-N5, TC-E1, TC-E2, TC-R1, TC-R2 |
| 实现约束 | 零构建链；Node.js >= 18；扫描脚本不依赖 npm 包；manifest 路径常量；Vue 模板自动转义 |
| 验证命令 | `node scripts/scan-stories.mjs && test -f docs/故事任务面板/_manifest.json && echo "PASS"` |

---

> **变更记录**
> | 日期 | 变更 | 触发 | 证据 |
> |------|------|------|------|
> | 2026-05-24 | 初始生成 | /rui story 页面只需要故事任务面板下的数据即可 | YiWeb-故事任务 §5 |
> | 2026-05-24 | 对齐 formulas.md — 补充 §3 环境专项、§4 测试环境、§5 评审清单 | /rui 使用新的文档标准重写 docs | formulas.md F.story.test-design |
