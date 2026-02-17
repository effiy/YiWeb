# YiWeb 目录结构

以下目录结构以项目根目录为起点，列出仓库内全部文件，并在每个文件后标注行数（按文件内容 splitlines 统计）与用途说明。

统计口径：

- 文件数：174
- 总行数：46899

```text
YiWeb/  — 项目根目录（静态页面 + 原生 ES Modules + Vue3 CDN）
  .gitignore  # 28 lines — Git 忽略规则（本地缓存、构建产物、日志等）
  docs/  — 项目文档（上手、架构、指南、排障）
    01-getting-started/  — 上手与运行方式
      01-quickstart.md  # 103 lines — 启动/访问、首次使用顺序、常见问题
    02-architecture/  — 架构与工程约定
      01-overview.md  # 99 lines — 页面装配流程、分层职责、关键入口索引
      02-directory-structure.md  # 254 lines — 全仓目录树（含行数与用途说明）
    03-guides/  — 开发指南（按主题拆分）
      01-networking.md  # 101 lines — 请求封装、X-Token 鉴权、JSON/流式调用
      02-components.md  # 166 lines — 组件目录约定、加载与注册机制、排错要点
    04-runbook/  — 运维与排障（现象驱动）
      01-troubleshooting.md  # 100 lines — 常见报错定位路径（404/401/CORS/流式等）
    00-README.md  # 38 lines — 文档导航入口（按章节链接）
  src/  — 前端源码（无需构建，直接由静态服务器提供）
    assets/  — 静态资源（提示词、模板、文本资料）
      prompts/  — 内置 Prompt / 模板库
        aicr/  — AICR（代码审查）相关提示词
          codereview.txt  # 39 lines — 代码审查提示词模板（指导输出结构）
          knowledgeCard.txt  # 160 lines — 知识卡片提示词模板（结构化总结）
        mermaid/  — Mermaid 相关提示词
          autoFix.txt  # 44 lines — Mermaid 自动修复提示词（语法纠错）
        read/  — 阅读/书单相关内容
          books.txt  # 112 lines — 书单与摘要素材（供页面/功能展示）
    components/  — 可复用组件库（业务/通用/领域组件）
      business/  — 业务复用组件（偏场景）
        newsList/  — 新闻列表（业务展示）
          index.css  # 563 lines — 新闻列表样式
          index.html  # 226 lines — 新闻列表模板
          index.js  # 258 lines — 新闻列表逻辑（渲染、点击、收藏/已读等）
      calendar/  — 日历基础组件（偏通用）
        calendar.css  # 337 lines — 日历主体样式
        date-navigation.css  # 305 lines — 日期导航/切换样式
        index.css  # 2 lines — 日历组件入口样式聚合（轻量）
        index.html  # 99 lines — 日历组件模板
        index.js  # 69 lines — 日历组件逻辑（基础交互与输出）
      common/  — 通用 UI 组件（不绑业务）
        searchHeader/  — 搜索头部（输入框/按钮/事件）
          index.css  # 877 lines — 搜索头部样式
          index.html  # 130 lines — 搜索头部模板
          index.js  # 346 lines — 搜索头部逻辑（输入、触发、快捷键等）
        yiButton/  — 按钮组件（统一样式/交互）
          index.html  # 24 lines — 按钮模板
          index.js  # 111 lines — 按钮逻辑（状态、loading、事件封装）
        yiEmptyState/  — 空态组件（统一提示）
          index.html  # 27 lines — 空态模板
          index.js  # 56 lines — 空态逻辑（文案/slot/可选样式）
        yiErrorState/  — 错误态组件（统一提示）
          index.html  # 18 lines — 错误态模板
          index.js  # 45 lines — 错误态逻辑（重试/提示）
        yiIconButton/  — 图标按钮（可访问性属性封装）
          index.html  # 11 lines — 图标按钮模板
          index.js  # 37 lines — 图标按钮逻辑（click、aria 等）
        yiLoading/  — Loading 组件（统一加载态）
          index.html  # 6 lines — Loading 模板
          index.js  # 32 lines — Loading 逻辑（文案/显示控制）
        yiModal/  — 弹窗组件（遮罩/关闭逻辑）
          index.html  # 7 lines — Modal 模板
          index.js  # 51 lines — Modal 逻辑（关闭、Esc、点击遮罩）
        yiTag/  — 标签组件（标记/筛选 UI）
          index.html  # 15 lines — Tag 模板
          index.js  # 87 lines — Tag 逻辑（状态切换、事件封装）
    markdown/  — Markdown / Mermaid 渲染能力（可嵌入页面）
      markdownView/  — Markdown 视图组件
        index.js  # 44 lines — Markdown 视图组件定义与注册
      mermaid/  — Mermaid 渲染与交互（复制/下载/全屏等）
        mermaid.js  # 301 lines — Mermaid 初始化与基础渲染入口
        mermaidClipboard.js  # 386 lines — Mermaid 复制能力（图/代码）
        mermaidDownload.js  # 470 lines — Mermaid 下载导出（PNG/SVG 等）
        mermaidFullscreen.js  # 516 lines — Mermaid 全屏展示逻辑
        mermaidRenderer.js  # 913 lines — Mermaid 渲染管线（解析、布局、错误处理）
        mermaidRenderer.templates.js  # 249 lines — Mermaid 渲染模板片段（HTML/SVG 片段）
        mermaidUi.js  # 151 lines — Mermaid UI 交互层（按钮、状态、事件）
      index.js  # 1 lines — markdown 模块导出入口
      markdownRenderer.frontmatter.js  # 312 lines — Frontmatter 解析与元信息提取
      markdownRenderer.js  # 283 lines — Markdown 渲染入口（marked/自定义规则）
      markdownRenderer.sanitize.js  # 765 lines — Markdown 安全清洗（XSS 防护）
      markdownRenderer.utils.js  # 95 lines — Markdown 渲染辅助工具（小工具函数）
    services/  — 与后端交互与业务服务层（请求、协议、会话等）
      aicr/  — AICR 业务服务
        sessionSyncService.js  # 845 lines — 会话同步/缓存/增量更新等能力
      business/  — 业务流程/分析类服务
        businessProcessManager.js  # 302 lines — 业务流程编排（跨模块调用/状态推进）
        businessScenarioAnalyzer.js  # 157 lines — 场景识别与策略选择（输入→策略）
        requirementAnalysisManager.js  # 37 lines — 需求分析入口（轻量封装）
      helper/  — 请求/鉴权/状态处理基础设施
        apiUtils.js  # 143 lines — API URL/参数组装与通用工具
        authErrorHandler.js  # 240 lines — 401/鉴权错误统一处理（提示/清理 token）
        authUtils.js  # 372 lines — Token 存取与请求头注入（X-Token）
        checkStatus.js  # 99 lines — 响应状态检查与错误抛出（统一语义）
        requestHelper.js  # 607 lines — fetch 封装（超时/Abort/日志/拦截器）
      modules/  — 具体业务接口模块（按能力拆分）
        crud.js  # 802 lines — CRUD + 流式 Prompt（协议兼容、缓存、回退重试）
        goals.js  # 103 lines — goals 相关接口封装（示例/业务模块）
      index.js  # 74 lines — services 对外聚合导出（页面侧统一入口）
    styles/  — 全局样式体系（基础/组件/布局）
      base/  — 设计基础（reset/排版/主题/间距）
        animations.css  # 714 lines — 动画与过渡集合
        display.css  # 231 lines — display/定位等基础工具类
        reset.css  # 354 lines — 浏览器样式重置
        spacing.css  # 230 lines — 间距工具类（padding/margin）
        theme.css  # 186 lines — 主题变量与颜色体系（CSS variables）
        typography.css  # 442 lines — 排版/字体/文本工具类
      components/  — 组件级通用样式（可复用）
        button.css  # 253 lines — 按钮样式体系（尺寸/状态）
        edit-card.css  # 394 lines — 编辑卡片/容器样式
        input.css  # 346 lines — 输入框样式（focus/校验态）
        loading.css  # 366 lines — Loading/骨架等样式
        message.css  # 384 lines — 消息提示样式（toast/alert）
        tag.css  # 56 lines — 标签样式
      layout/  — 布局样式
        layout.css  # 112 lines — 页面布局工具（栅格/分栏等）
      utils/  — 样式辅助（小型工具）
        typography.css  # 2 lines — 排版辅助补充
      index.css  # 26 lines — 样式入口聚合（统一引入）
    utils/  — 通用工具库（跨页面复用）
      aicr/  — AICR 相关工具
        fileFieldNormalizer.js  # 221 lines — 文件字段归一化（适配不同协议字段）
      browser/  — 浏览器相关封装
        dom.js  # 371 lines — DOM 操作工具（选择、尺寸、滚动等）
        events.js  # 545 lines — 事件/监听封装（节流、防抖、委托等）
        index.js  # 2 lines — browser 工具导出入口
      core/  — 核心基础设施（日志/错误/性能）
        common.js  # 386 lines — 通用工具（类型判断、对象操作等）
        error.js  # 558 lines — 统一错误处理与 safeExecute（兜底）
        index.js  # 3 lines — core 工具导出入口
        log.js  # 119 lines — 日志封装（debug 开关、分级输出）
        performance.js  # 362 lines — 性能打点与统计工具
      data/  — 数据模型/领域工具
        domain.js  # 333 lines — 领域对象与转换工具（统一数据形态）
      io/  — 导入导出相关工具
        exportUtils.js  # 423 lines — 导出工具（文件、文本、下载等）
      render/  — 渲染相关工具
        index.js  # 3 lines — render 工具导出入口
      time/  — 时间工具
        date.js  # 176 lines — 日期处理工具
        index.js  # 3 lines — time 工具导出入口
        timeParams.js  # 321 lines — 时间参数解析/序列化
        timeSelectors.js  # 148 lines — 时间选择/范围辅助
      ui/  — UI 工具（非组件）
        loading.js  # 121 lines — 全局 loading 控制/注入
        message.js  # 34 lines — 消息提示快捷封装
        messageCore.js  # 615 lines — 消息提示核心实现（队列/渲染）
        template.js  # 20 lines — 模板字符串/DOM 片段工具
      view/  — 页面装配层（创建 app、组件注册）
        baseView.js  # 447 lines — 页面装配工厂（createBaseView/createAndMountApp）
        componentLoader.js  # 121 lines — 组件加载器（CSS 注入/模板加载/挂到 window）
        index.js  # 2 lines — view 工具导出入口
      index.js  # 11 lines — utils 总出口（按域聚合）
    views/  — 页面集合（每页一个入口目录）
      aicr/  — AICR 页面（代码审查/会话/文件树）
        components/  — AICR 页面内组件（页面私有）
          aicrCodeArea/  — 代码区容器组件
            index.html  # 202 lines — 代码区模板（布局/插槽）
            index.js  # 9 lines — 代码区组件注册入口
          aicrHeader/  — 顶部栏组件
            index.html  # 21 lines — 顶部栏模板（按钮/标题）
            index.js  # 9 lines — 顶部栏组件注册入口
          aicrModals/  — 弹窗集合（设置/帮助/对话等）
            index.html  # 495 lines — 弹窗模板集合（多弹窗结构）
            index.js  # 9 lines — 弹窗组件注册入口
          aicrPage/  — 页面根组件
            index.html  # 6 lines — 页面根模板（根容器）
            index.js  # 6 lines — 页面根组件注册入口
          aicrSidebar/  — 侧边栏组件（文件树/会话入口）
            index.html  # 62 lines — 侧边栏模板
            index.js  # 9 lines — 侧边栏组件注册入口
          codeView/  — 代码展示与高亮/Markdown 视图
            index.html  # 223 lines — 代码视图模板（编辑区/工具栏）
            index.js  # 492 lines — 代码视图逻辑（加载、渲染、交互）
          fileTree/  — 文件树组件（结构/交互/样式）
            fileTreeComponent.js  # 90 lines — 文件树组件定义/组合入口
            fileTreeComputed.js  # 160 lines — 文件树计算属性（筛选、派生状态）
            fileTreeLayout.css  # 483 lines — 文件树布局样式（分栏/滚动）
            fileTreeMethods.js  # 341 lines — 文件树交互方法（展开、选中、搜索等）
            fileTreeNode.js  # 575 lines — 树节点渲染与节点行为（核心）
            fileTreeTags.css  # 318 lines — 标签/标记样式（状态/过滤）
            fileTreeTreeBase.css  # 137 lines — 树基础样式（层级、连接线）
            fileTreeTreeExtras.css  # 416 lines — 树扩展样式（hover、动画、密度）
            fileTreeUtils.js  # 46 lines — 文件树工具函数（路径/节点处理）
            index.css  # 4 lines — 文件树样式入口聚合
            index.html  # 234 lines — 文件树模板（容器/slot）
            index.js  # 4 lines — 文件树组件注册入口
        hooks/  — AICR 页面 hooks（store/computed/methods 与子模块）
          authDialogMethods.js  # 253 lines — 鉴权弹窗逻辑（token 输入/保存/校验）
          fileDeleteService.js  # 212 lines — 文件删除相关服务封装（调用与状态）
          fileTreeCrudMethods.js  # 282 lines — 文件树 CRUD 方法（拉取/更新/缓存）
          folderTransferMethods.js  # 394 lines — 文件夹转移/移动相关逻辑
          mainPageMethods.js  # 520 lines — 主页面动作集合（路由参数/初始化/交互）
          projectZipMethods.js  # 703 lines — 项目打包/解包与文件树构建（zip 流程）
          sessionActionMethods.js  # 640 lines — 会话动作（创建/删除/切换/操作）
          sessionChatContextChatMethods.js  # 510 lines — 会话聊天上下文：聊天逻辑（非流式）
          sessionChatContextChatMethods.streaming.js  # 815 lines — 会话聊天上下文：流式输出处理
          sessionChatContextContextMethods.js  # 457 lines — 会话上下文：上下文内容/文件联动
          sessionChatContextMethods.js  # 926 lines — 会话上下文总控（组装与状态机）
          sessionChatContextMethods.helpers.js  # 111 lines — 会话上下文辅助函数（抽离通用逻辑）
          sessionChatContextMethods.scrollSync.js  # 160 lines — 会话/代码区滚动同步（阅读体验）
          sessionChatContextMethods.selectSession.js  # 225 lines — 会话选择与切换逻辑（列表联动）
          sessionChatContextSettingsMethods.js  # 93 lines — 会话设置项逻辑（模型/偏好等）
          sessionChatContextShared.js  # 927 lines — 会话共享工具（常量、工具、复用逻辑）
          sessionChatContextShared.welcomeCard.js  # 210 lines — 欢迎卡片/引导内容逻辑
          sessionEditMethods.js  # 472 lines — 会话编辑（标题/标签/内容等）
          sessionFaqMethods.js  # 547 lines — FAQ/提示集逻辑（常见问答/引导）
          sessionListMethods.js  # 843 lines — 会话列表逻辑（分页/筛选/缓存）
          store.js  # 3 lines — store 入口（创建并导出）
          storeFactory.js  # 67 lines — store 工厂（初始化组合）
          storeFileContentOps.js  # 346 lines — 文件内容操作（读写/缓存/同步）
          storeFileTreeBuilders.js  # 112 lines — 文件树构建器（由数据生成树）
          storeFileTreeOps.js  # 676 lines — 文件树操作（增删改查、定位、遍历）
          storeSessionsOps.js  # 143 lines — 会话数据操作（增删改与缓存）
          storeState.js  # 221 lines — store 状态定义（ref/reactive）
          storeUiOps.js  # 106 lines — UI 状态操作（面板、布局、交互）
          tagManagerMethods.js  # 767 lines — 标签管理（增删改、过滤、持久化）
          useComputed.js  # 270 lines — 组合计算属性（聚合各模块）
          useMethods.js  # 609 lines — 组合 methods（聚合各模块）
        codePage.contextModals.css  # 843 lines — AICR 弹窗相关样式（设置/帮助等）
        codePage.css  # 747 lines — AICR 页面主样式（整体布局与主题）
        index.css  # 520 lines — AICR 页面入口样式（汇总与覆盖）
        index.html  # 50 lines — AICR 页面 HTML 入口（CDN 引入与容器）
        index.js  # 667 lines — AICR 页面 JS 入口（createBaseView 装配）
        layout.css  # 653 lines — AICR 布局细化样式（分栏/拖拽/响应式）
        welcomeCard.css  # 242 lines — 欢迎卡片样式（引导内容）
      news/  — 新闻页面（列表 + 日历 + RSS 管理）
        hooks/  — 新闻页 hooks（store/computed/methods）
          store.js  # 896 lines — 新闻页状态（列表、筛选、RSS、持久化等）
          useComputed.js  # 365 lines — 新闻页派生状态（过滤、统计、展示数据）
          useMethods.js  # 624 lines — 新闻页动作方法（加载、交互、缓存更新）
        index.css  # 276 lines — 新闻页样式
        index.html  # 381 lines — 新闻页 HTML 入口与模板（布局结构）
        index.js  # 46 lines — 新闻页 JS 入口（装配并挂载）
    config.js  # 103 lines — 环境配置与 URL 构建（API_URL/DATA_URL 注入）
  favicon.ico  # 10 lines — 浏览器站点图标
  index.html  # 10 lines — 根入口占位（通常不直接使用）
```

## 读代码建议（从哪里开始）

- 页面入口：`src/views/**/index.html` → `src/views/**/index.js`
- 页面装配：[baseView.js](../../src/utils/view/baseView.js)
- 组件注册与模板加载：[componentLoader.js](../../src/utils/view/componentLoader.js)
- 请求与鉴权：[requestHelper.js](../../src/services/helper/requestHelper.js)、[authUtils.js](../../src/services/helper/authUtils.js)
