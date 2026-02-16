# YiWeb 快速上手

## 环境准备

- 操作系统：macOS / Windows / Linux
- 浏览器：Chrome / Edge（推荐，便于使用 DevTools）
- Python：3.x（用于启动本地静态文件服务器）

说明：

- 本项目以“静态页面 + 原生 ES Modules”方式运行，不需要构建即可打开页面
- 不要用 `file://` 直接打开 HTML（会遇到模块加载/跨域等限制）

## 设计理念（为什么这样做）

- 降低门槛：把“能跑起来”的前置条件压到最低（一个静态服务器 + 浏览器），方便快速迭代与演示
- 便于读代码：页面入口清晰（`src/views/**/index.html` → `index.js`），依赖路径可在 Network 里直接验证
- 可逐步工程化：先用约定分层（store/computed/methods），后续需要时再引入构建/类型/测试体系

## 工具配置（推荐）

- VS Code
  - 直接打开项目根目录
  - 建议开启 ESM/JS 相关语法提示（默认即可）
- 浏览器 DevTools
  - Console：查看页面初始化/接口报错
  - Network：排查接口 401、跨域、超时
  - Application → Local Storage：查看/清理 Token 与页面状态缓存

可选：

- Live Server（或任意静态服务器工具）：替代 Python 启动

## 启动与访问

在项目根目录启动静态服务器：

```bash
python3 -m http.server 5174
```

打开页面入口：

- 新闻页：`http://localhost:5174/src/views/news/index.html`
- AICR 页：`http://localhost:5174/src/views/aicr/index.html`

端口冲突处理：

- 5174 被占用时，换一个端口（例如 5175），并同步替换访问 URL

## 第一次使用（建议顺序）

1. 打开页面后打开 DevTools，确认无资源加载失败
2. 若页面需要调用后端 API：设置 `X-Token`
   - 点击顶部工具栏“钥匙”按钮（API 鉴权）
   - Token 会写入 `localStorage`：`YiWeb.apiToken.v1`
3. 如需查看更多日志：开启 debug
   - URL 加 `?debug=true`，或执行 `localStorage.setItem('debug','true')` 后刷新

## 配置与环境切换

接口地址配置在 [config.js](../../src/config.js)：

- `API_URL`：业务 API（AICR 会话/文件等）
- `DATA_URL`：数据服务（例如新闻数据）
- 页面加载后会注入：`window.API_URL`、`window.DATA_URL`、`window.__ENV__`

当前代码中环境名 `ENV` 默认固定为 `prod`。如需改成本地接口：

- 直接修改 `src/config.js` 里的 `ENV` / `ENDPOINTS` 配置并刷新页面

## 如何使用

### 新闻页（news）

- 搜索：顶部输入框输入关键词
- 已读/收藏：对条目进行点击/收藏操作（会写入 localStorage 做持久化）
- 日期切换：右侧日历选择日期加载对应数据
- RSS 管理：打开 RSS 管理面板，维护订阅源与查看调度状态

### AICR 页（代码审查）

- 文件树：左侧浏览/搜索文件并选择
- 代码视图：中间展示选中文件内容
- 会话聊天：右侧面板围绕文件/会话进行对话与记录（支持收起/展开）

## 常见问题排查

- 页面空白
  - 确认使用静态服务器访问（不是 `file://`）
  - 打开 Console 看是否有模块路径 404 或 CDN 资源失败
- 接口 401 / 未授权
  - 通过“钥匙”按钮设置 `X-Token` 后重试
  - 可在 Application → Local Storage 检查 `YiWeb.apiToken.v1` 是否存在
- 跨域/CORS
  - Network 中查看请求响应头与报错信息
  - 后端需允许来自本地页面域名的访问（例如 `http://localhost:5174`）

## 优化与开发体验建议

- 开发时建议打开 DevTools 的 “Disable cache”（Network 面板），避免修改后被缓存误导
- 调试流式接口时，优先确认响应 `Content-Type` 是否包含 `text/event-stream`
- 若页面加载慢，先检查是否有 CDN 资源失败或模块 404（通常是首要瓶颈）
