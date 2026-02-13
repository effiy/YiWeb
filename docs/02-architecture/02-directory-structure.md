# YiWeb 目录结构

以下目录结构以项目根目录为起点，聚焦“页面入口 → 组件 → 服务 → 工具”的主干路径。

```text
YiWeb/
  index.html                  # 根入口（加载基础资源/提供静态入口）
  favicon.ico                 # 站点图标
  .gitignore                  # Git 忽略规则

  docs/                       # 项目文档（入口：docs/00-README.md）
    00-README.md              # 文档总目录/阅读入口
    01-getting-started/       # 快速上手
      01-quickstart.md        # 本地运行与快速体验
    02-architecture/          # 架构与设计说明
      01-overview.md          # 架构总览（边界/分层/关键约定）
      02-directory-structure.md # 目录结构说明（本文）
    03-guides/                # 研发指南
      01-networking.md        # 网络请求/鉴权/错误处理约定
      02-components.md        # 组件组织方式与复用规范
    04-runbook/               # 运行手册
      01-troubleshooting.md   # 常见问题排查

  src/                         # 源代码目录
    config.js                 # 环境/接口配置（注入 window.API_URL / window.DATA_URL 等）

    views/                    # 页面（每个页面通常有 index.html + index.js + index.css）
      news/                   # 智能新闻助手页面
        index.html            # 页面 HTML 入口（挂载点/基础结构）
        index.js              # 页面主入口（createBaseView 装配组件）
        index.css             # 页面级样式
        hooks/                # 页面级状态与派生逻辑
          store.js            # 页面级 store（状态源）
          useComputed.js      # computed/派生数据
          useMethods.js       # 页面操作方法（事件处理/调用服务）
      aicr/                   # 代码审查助手页面
        index.html            # 页面 HTML 入口（挂载点/基础结构）
        index.js              # 页面主入口（createBaseView 装配组件）
        index.css             # 页面级样式
        hooks/                # 页面级状态与派生逻辑
          store.js            # 页面级 store（状态源）
          useComputed.js      # computed/派生数据
          useMethods.js       # 页面操作方法（事件处理/调用服务）
        components/           # AICR 页面内组件（布局/侧边栏/代码区/弹窗等）
          aicrCodeArea/       # 代码内容区（编辑/预览/交互）
            index.html        # 组件模板
            index.js          # 组件逻辑（数据绑定/事件）
          aicrHeader/         # 页面头部（标题/操作入口）
            index.html        # 组件模板
            index.js          # 组件逻辑
          aicrModals/         # 页面弹窗集合（复用 baseModal）
            index.html        # 组件模板
            index.js          # 组件逻辑
          aicrPage/           # 页面骨架/主体布局容器
            index.html        # 组件模板
            index.js          # 组件逻辑
          aicrSidebar/        # 侧边栏（会话/文件等）
            index.html        # 组件模板
            index.js          # 组件逻辑
          fileTree/           # 文件树视图
            index.css         # 组件样式
            index.html        # 组件模板
            index.js          # 组件逻辑（节点渲染/交互）
          codeView/           # 代码视图（渲染/高亮/定位等）
            index.html        # 组件模板
            index.js          # 组件逻辑

    components/               # 可复用组件（通常 CSS/HTML/JS 分离）
      common/                 # 通用组件（搜索头、列表等）
        searchHeader/         # 搜索头部组件（输入/筛选）
          index.css           # 组件样式
          index.html          # 组件模板
          index.js            # 组件逻辑（输入/事件）
        baseModal/            # 通用弹窗组件
          index.html          # 通用弹窗模板（遮罩/容器）
          index.js            # 弹窗行为与生命周期控制
        baseLoading/          # 通用加载态组件
          index.html          # 通用加载态模板
          index.js            # 加载态显示/隐藏控制
        baseEmptyState/       # 通用空状态组件
          index.html          # 空状态模板（占位图文/引导）
          index.js            # 空状态渲染与参数化
        baseErrorState/       # 通用错误状态组件
          index.html          # 错误状态模板（错误提示/重试入口）
          index.js            # 错误态渲染与重试回调绑定
        baseIconButton/       # 通用图标按钮组件
          index.html          # 图标按钮模板
          index.js            # 图标按钮交互（点击/禁用等）
      business/               # 业务组件（新闻列表等）
        newsList/             # 新闻列表组件
          index.css           # 组件样式
          index.html          # 组件模板
          index.js            # 组件逻辑（渲染列表/交互）
        calendarView/         # 日历视图业务组件
          index.css           # 日历视图业务样式（容器/布局）
          index.js            # 日历视图业务逻辑（装配 calendar 组件）
      calendar/               # 日历组件
        index.css             # 组件入口样式（聚合/覆盖）
        index.html            # 组件模板（容器结构）
        index.js              # 组件逻辑（日历渲染/选择/切换）
        calendar.css          # 日历网格/日期单元样式
        date-navigation.css   # 顶部导航（月份切换等）样式

    services/                 # API / 业务服务层
      index.js                # 服务聚合出口（统一导出各模块能力）
      modules/                # 面向资源/能力的 API 模块
        crud.js               # 通用 CRUD 请求封装（增删改查）
        goals.js              # goals 相关 API 封装
      helper/                 # 请求/鉴权/错误处理等基础能力
        requestHelper.js      # 请求入口（组装参数/发起请求/统一错误处理）
        apiUtils.js           # API 辅助方法（URL/参数/响应处理等）
        authUtils.js          # 鉴权相关工具（token/头部/登录态）
        authErrorHandler.js   # 鉴权失败的统一处理（跳转/提示/重试策略）
        checkStatus.js        # HTTP 状态码检查与异常抛出
      business/               # 业务流程/场景分析等
        businessProcessManager.js # 业务流程编排与管理
        businessScenarioAnalyzer.js # 业务场景识别/分析
        requirementAnalysisManager.js # 需求分析/结构化整理
      aicr/                   # AICR 相关服务
        sessionSyncService.js # AICR 会话状态同步（本地/远端）

    markdown/                 # Markdown 与 Mermaid 渲染
      index.js                # markdown 模块聚合出口
      markdownRenderer.js     # Markdown 渲染器（解析/转 HTML）
      markdownView/            # Markdown 渲染承载视图组件目录
        index.js              # MarkdownView 组件（承载渲染结果）
      mermaid/                # Mermaid 渲染相关
        mermaid.js            # Mermaid 运行时/初始化封装
        mermaidRenderer.js    # Mermaid 渲染器（从代码块到 SVG）

    utils/                    # 通用工具库
      index.js                # utils 聚合出口
      core/                   # 核心工具：日志、错误、通用方法、性能等
        log.js                # 日志封装（级别/开关/格式）
        error.js              # 错误构造与错误工具（标准化错误对象）
        common.js             # 通用小工具（判空/格式化等）
        performance.js        # 性能辅助（打点/耗时统计等）
        index.js              # core 模块聚合出口
      view/                   # 视图装配与组件加载
        baseView.js           # 页面装配基座（挂载/生命周期/渲染流程）
        componentLoader.js    # 组件加载器（拉取模板/CSS/JS 并注册）
        index.js              # view 模块聚合出口
      browser/                # DOM/事件等浏览器工具
        dom.js                # DOM 查询/创建/更新辅助
        events.js             # 事件绑定/委托/解绑工具
        index.js              # browser 模块聚合出口
      time/                   # 时间/日期工具
        date.js               # 日期处理工具（格式化/区间等）
        timeParams.js         # 时间参数解析与归一化
        timeSelectors.js      # 时间筛选器（快捷选项/范围生成）
        index.js              # time 模块聚合出口
      ui/                     # UI 工具：loading/message/template 等
        loading.js            # 全局 loading 控制（显示/隐藏/计数）
        message.js            # 消息提示（toast/错误提示等）
        template.js           # 模板处理（插值/片段拼装）
      data/                   # 轻量数据/映射（如域名分类）
        domain.js             # 域名/分类映射与相关常量
      io/                     # 导入导出等 I/O 相关工具
        exportUtils.js        # 导出工具（下载/生成文件等）
      render/                 # 渲染辅助工具
        index.js              # render 模块聚合出口
      aicr/                   # AICR 辅助工具
        fileFieldNormalizer.js # AICR 文件字段归一化（适配不同数据源）

    styles/                   # 全局样式体系
      index.css               # 全局样式入口（聚合各子样式）
      base/                   # reset/排版/间距/主题等基础样式
        reset.css             # 浏览器默认样式重置
        typography.css        # 排版（字体/字号/行高）
        spacing.css           # 间距体系（margin/padding 变量/工具类）
        theme.css             # 主题变量（颜色/阴影等）
        display.css           # 展示相关工具类（display/overflow 等）
        animations.css        # 通用动画/过渡
      layout/                  # 布局样式
        layout.css            # 布局工具（栅格/容器/页面结构）
      components/             # 通用组件样式（button/input/message 等）
        button.css            # 按钮样式
        input.css             # 输入框样式
        message.css           # 消息提示样式
        loading.css           # loading 样式
        edit-card.css         # 编辑卡片样式
        tag.css               # 标签样式
      utils/                  # 样式工具（可复用排版/工具类补充）
        typography.css        # 排版工具类补充（组件/页面复用）

    assets/                   # 资源文件
      prompts/                # 提示词/模板资源
        aicr/                 # AICR 提示词
          codereview.txt      # 代码审查提示词模板
          knowledgeCard.txt   # 知识卡片提示词模板
        mermaid/              # Mermaid 提示词
          autoFix.txt         # Mermaid 自动修复提示词模板
        read/                 # 阅读相关提示词/数据
          books.txt           # 阅读/书单相关提示词或数据
```

## 读代码建议（从哪里开始）

- 页面入口：`src/views/**/index.html` → `src/views/**/index.js`
- 页面装配：[baseView.js](../../src/utils/view/baseView.js)
- 组件注册与模板加载：[componentLoader.js](../../src/utils/view/componentLoader.js)
- 请求与鉴权：[requestHelper.js](../../src/services/helper/requestHelper.js)、[authUtils.js](../../src/services/helper/authUtils.js)
