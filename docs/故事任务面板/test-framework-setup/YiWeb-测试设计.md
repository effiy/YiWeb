> | v1.0.0 | 2026-05-22 | deepseek-v4-pro | 🌿 feat/test-framework-setup | ⏱️ — | 📎 [CLAUDE.md](../../../CLAUDE.md) |

> **导航**: [← YiWeb-技术评审](./YiWeb-技术评审.md) · [YiWeb-实施报告 →](./YiWeb-实施报告.md)

> **来源引用**: 基于 [YiWeb-故事任务](./YiWeb-故事任务.md) §5 AC# + [YiWeb-使用场景](./YiWeb-使用场景.md) 场景 1–5 + [YiWeb-技术评审](./YiWeb-技术评审.md) §4 Mock 策略。

[§0 基线溯源](#sec0-baseline) · [§1 测试范围](#sec1-scope) · [§2 正常路径用例](#sec2-normal) · [§3 边界/异常用例](#sec3-edge) · [§4 回归用例](#sec4-regression) · [§5 Gate A 交接](#sec5-gate-a)

---

### 主要价值

- 🎯 AC 全覆盖 — 每用例显式溯源至故事任务 AC#，确保验收可执行
- 🔒 四类用例 — 正常/边界/异常/回归，每类独立验证不同风险面
- ⚡ Gate A 交接 — 明确列出 P0 用例 ID 和验证命令，Gate A 通过标准无歧义
- 📊 可执行 Given/When/Then — 每用例可直接转为 vitest 代码

---

<a id="sec0-baseline"></a>

## §0 基线溯源

| 溯源目标 | 本文档章节 | 覆盖用例数 |
|---------|-----------|----------|
| AC1: package.json + vitest.config.js | §2 TC-N01, §3 TC-E01 | 2 |
| AC2: `npx vitest run` 可执行 | §2 TC-N02 | 1 |
| AC3: smoke test 通过 | §2 TC-N03 | 1 |
| AC4: CDN 工具层 ≥ 5 文件 ≥ 30 用例 | §2 TC-N04–N10, §3 TC-E02–E05 | 13 |
| AC5: API 服务层 ≥ 3 文件 ≥ 15 用例 | §2 TC-N11–N14, §3 TC-E06–E08 | 7 |
| AC6: `npm test` 全量通过 | §2 TC-N15 | 1 |
| AC7: 视图框架 ≥ 1 文件 ≥ 5 用例 | §2 TC-N16–N18 | 3 |
| AC8: git diff 仅新增文件 | §4 TC-R01 | 1 |
| 场景 1: 初始化框架 | §2 TC-N01–N03 | 3 |
| 场景 2: CDN 工具层 | §2 TC-N04–N10, §3 TC-E02–E05 | 11 |
| 场景 3: API 服务层 | §2 TC-N11–N14, §3 TC-E06–E08 | 7 |
| 场景 4: CI 环境 | §2 TC-N15 | 1 |
| 场景 5: 调试失败 | §3 TC-E09 | 1 |

---

<a id="sec1-scope"></a>

## §1 测试范围

| 维度 | 范围 |
|------|------|
| 测试框架 | Vitest 1.x + jsdom |
| 覆盖模块 | CDN 工具层（7 文件）+ API 服务层（4 文件）+ 视图框架（1 文件） |
| 测试类型 | 单元测试（L1/L2/L3）+ 集成测试（L4） |
| 不覆盖 | 业务视图（aicr/story/claude）、E2E、性能测试 |

---

<a id="sec2-normal"></a>

## §2 正常路径用例

### TC-N01: package.json 包含正确字段

| 字段 | 内容 |
|------|------|
| 溯源 | AC1 |
| Given | 项目根目录存在 package.json |
| When | 读取并解析 package.json |
| Then | `type` 字段值为 `"module"`，`scripts.test` 值为 `"vitest run"`，`devDependencies.vitest` 存在 |

### TC-N02: vitest.config.js 被正确加载

| 字段 | 内容 |
|------|------|
| 溯源 | AC2 |
| Given | 项目根目录存在 vitest.config.js |
| When | 运行 `npx vitest run --config vitest.config.js` |
| Then | Vitest 启动成功，识别 jsdom 环境和路径别名，退出码 0 |

### TC-N03: smoke test 验证 ESM 导入链

| 字段 | 内容 |
|------|------|
| 溯源 | AC3 |
| Given | test/smoke.test.js 存在，导入 `/cdn/utils/core/error.js` |
| When | 运行 `npx vitest run` |
| Then | smoke test 通过，ErrorCodes / ErrorTypes / createError 均可访问，值为预期类型 |

### TC-N04: createError 创建标准错误对象

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 createError, ErrorTypes, ErrorCodes |
| When | 调用 `createError('test message', ErrorTypes.API, 'test context', ErrorCodes.HTTP_ERROR)` |
| Then | 返回对象含 `{ message: 'test message', type: 'API', context: 'test context', code: 'HTTP_ERROR', timestamp, level }` |

### TC-N05: ErrorCodes 枚举完整性

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 ErrorCodes |
| When | 枚举所有键 |
| Then | 包含 AUTH_401 / HTTP_ERROR / REQUEST_TIMEOUT / NETWORK_FETCH_FAILED / CORS_BLOCKED / STREAM_API_ERROR / COMPONENT_LOAD_TIMEOUT / MODULE_LOAD_FAILED / TEMPLATE_FETCH_FAILED |

### TC-N06: logInfo 输出正确格式

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 logInfo，mock console.log |
| When | 调用 `logInfo('[Test]', 'message', { key: 'val' })` |
| Then | console.log 被调用，参数含 `[Test]` 前缀和 `message` 和 `{ key: 'val' }` |

### TC-N07: logWarn / logError 输出正确级别

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 logWarn, logError，mock console.warn, console.error |
| When | 分别调用 logWarn 和 logError |
| Then | console.warn 和 console.error 分别被调用 |

### TC-N08: validation 类型检查函数

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 validation 模块 |
| When | 对 string/number/boolean/array/object/null/undefined 执行类型检查 |
| Then | 每种类型返回正确判定 |

### TC-N09: storage 读写正常路径

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | localStorage 为空 |
| When | 调用 setItem('key', { data: 'val' }) 后调用 getItem('key') |
| Then | getItem 返回 `{ data: 'val' }`（JSON 反序列化后） |

### TC-N10: string 工具函数

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 string 工具模块 |
| When | 调用 camelToKebab / kebabToCamel / truncate 等函数 |
| Then | 转换结果符合预期 |

### TC-N11: authUtils Token 存储与读取

| 字段 | 内容 |
|------|------|
| 溯源 | AC5 |
| Given | localStorage 无 Token |
| When | 调用 setToken('test-token-123') 后调用 getToken() |
| Then | getToken 返回 `'test-token-123'` |

### TC-N12: requestHelper 成功请求

| 字段 | 内容 |
|------|------|
| 溯源 | AC5 |
| Given | mock fetch 返回 `{ ok: true, status: 200, json: async () => ({ success: true }) }` |
| When | 调用 requestHelper 发起 GET 请求 |
| Then | 返回 `{ success: true }`，fetch 被调用时含 `credentials: 'omit'` 和 `X-Token` 头 |

### TC-N13: crud GET 操作含缓存

| 字段 | 内容 |
|------|------|
| 溯源 | AC5 |
| Given | mock fetch 返回成功响应 |
| When | 连续两次调用同一 GET 请求 |
| Then | 首次调用 fetch 被触发，第二次命中缓存不触发 fetch |

### TC-N14: authErrorHandler 处理 401

| 字段 | 内容 |
|------|------|
| 溯源 | AC5 |
| Given | mock fetch 返回 `{ ok: false, status: 401 }` |
| When | requestHelper 发出请求并收到 401 |
| Then | authErrorHandler 被触发，登录弹窗显示 |

### TC-N15: npm test 执行全部测试

| 字段 | 内容 |
|------|------|
| 溯源 | AC6 |
| Given | 所有测试文件就绪 |
| When | 运行 `npm test` |
| Then | 全部测试套件执行，退出码 0 |

### TC-N16: createBaseView 注册视图

| 字段 | 内容 |
|------|------|
| 溯源 | AC7 |
| Given | jsdom 环境，创建空 DOM 容器 |
| When | 调用 createBaseView({ store, computed, methods, template }) |
| Then | 视图实例创建成功，store 数据可访问 |

### TC-N17: vueRef 响应式读写

| 字段 | 内容 |
|------|------|
| 溯源 | AC7 |
| Given | 创建 vueRef('initial') |
| When | 读取 .value → 写入 .value = 'updated' → 再次读取 .value |
| Then | 首次读取 'initial'，写入后读取 'updated' |

### TC-N18: componentLoader 加载组件

| 字段 | 内容 |
|------|------|
| 溯源 | AC7 |
| Given | jsdom 环境，组件已注册到全局 registry |
| When | 调用 componentLoader 加载已注册组件 |
| Then | 组件 HTML 模板被插入 DOM，事件绑定就绪 |

---

<a id="sec3-edge"></a>

## §3 边界/异常用例

### TC-E01: package.json 缺失时 vitest 降级提示

| 字段 | 内容 |
|------|------|
| 溯源 | AC1 |
| Given | 项目根目录无 package.json |
| When | 运行 `npx vitest run` |
| Then | 提示 "No package.json found" 或 vitest 仍可运行（内置默认配置） |

### TC-E02: createError 空 message

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 createError |
| When | 调用 `createError('', ErrorTypes.UNKNOWN, '', ErrorCodes.UNKNOWN)` |
| Then | 返回对象 message 为空字符串但不抛出，code 为 UNKNOWN |

### TC-E03: storage getItem key 不存在

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | localStorage 为空 |
| When | 调用 getItem('non-existent-key') |
| Then | 返回 null 或 undefined（不抛出异常） |

### TC-E04: storage setItem 值含循环引用

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 创建含循环引用的对象 |
| When | 调用 setItem('key', circularObj) |
| Then | JSON.stringify 抛出 TypeError，storage 模块捕获并处理（返回 false 或抛出带上下文的错误） |

### TC-E05: validation 校验意外类型

| 字段 | 内容 |
|------|------|
| 溯源 | AC4 |
| Given | 导入 validation |
| When | 传入 Symbol / BigInt / class instance 等非标准类型 |
| Then | 返回合理结果，不抛出异常 |

### TC-E06: requestHelper 网络超时

| 字段 | 内容 |
|------|------|
| 溯源 | AC5 |
| Given | mock fetch 返回 Promise 永不 resolve（模拟超时） |
| When | requestHelper 发起请求，超时时间设为 100ms |
| Then | 请求被 AbortController 取消，错误 code 为 REQUEST_TIMEOUT |

### TC-E07: requestHelper 网络错误

| 字段 | 内容 |
|------|------|
| 溯源 | AC5 |
| Given | mock fetch reject  TypeError('Failed to fetch') |
| When | requestHelper 发起请求 |
| Then | 错误 code 为 NETWORK_FETCH_FAILED |

### TC-E08: crud 流式请求中断

| 字段 | 内容 |
|------|------|
| 溯源 | AC5 |
| Given | mock fetch 返回 ReadableStream，中途中断 |
| When | crud 发起流式请求，ReadableStream 抛出错误 |
| Then | 错误 code 为 STREAM_API_ERROR 或 STREAM_PARSE_FAILED |

### TC-E09: watch 模式下修改源码

| 字段 | 内容 |
|------|------|
| 溯源 | 场景 5 |
| Given | vitest watch 模式运行中 |
| When | 修改一个源码文件（非测试文件） |
| Then | vitest 自动重跑依赖该源码的测试，不重跑无关测试 |

---

<a id="sec4-regression"></a>

## §4 回归用例

### TC-R01: 测试基础设施不修改源码

| 字段 | 内容 |
|------|------|
| 溯源 | AC8 |
| Given | commit 前的 git 状态 |
| When | 执行 `git diff --name-only HEAD` |
| Then | 仅新增文件（package.json, vitest.config.js, test/**），src/ 和 cdn/ 下无修改 |

### TC-R02: 两次运行结果一致

| 字段 | 内容 |
|------|------|
| 溯源 | R5 |
| Given | 所有测试通过 |
| When | 连续运行 `npx vitest run` 两次 |
| Then | 两次结果相同（全部通过，无间歇性失败） |

### TC-R03: Mock 不跨文件泄漏

| 字段 | 内容 |
|------|------|
| 溯源 | R6 |
| Given | test A 中 mock 了 fetch |
| When | test A 完成后运行 test B |
| Then | test B 中 fetch 为原始 mock 或未 mock 状态，不受 test A 影响 |

---

<a id="sec5-gate-a"></a>

## §5 Gate A 交接信令

| 信号 | 值 | 验证命令 |
|------|-----|---------|
| P0 用例 ID 列表 | TC-N01–N14, TC-E01–E08, TC-R01–R03 | `npx vitest run --reporter=verbose` 查看执行列表 |
| 最少测试文件数 | CDN 层 ≥ 7 文件，API 层 ≥ 4 文件 | `find test -name '*.test.js' | wc -l` |
| 最少用例数 | ≥ 30 条 | `npx vitest run --reporter=json \| jq '.testResults[].assertionResults \| length' \| paste -sd+ \| bc` |
| 全量通过 | 退出码 0 | `npm test` |
| 源码零修改 | 仅新增文件 | `git diff --name-only HEAD` |
| Mock 隔离 | 随机顺序通过 | `npx vitest run --sequence.shuffle` |

**Gate A 通过标准**:
- [ ] 所有 P0 用例通过（TC-N01–N14, TC-E01–E08, TC-R01–R03）
- [ ] `npm test` 退出码 0
- [ ] 测试文件 ≥ 11 个
- [ ] 用例总数 ≥ 30 条
- [ ] `git diff --name-only HEAD` 无 src/ 或 cdn/ 修改
- [ ] `npx vitest run --sequence.shuffle` 通过（验证无顺序依赖）

---

> **变更记录**
> | 日期 | 变更 | 触发 | 证据 |
> |------|------|------|------|
> | 2026-05-22 | 初始生成 | /rui doc | YiWeb-故事任务 §5 AC# + YiWeb-技术评审 §4 |
