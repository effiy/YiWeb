# YiWeb 目录结构

以下目录结构以项目根目录为起点，聚焦“页面入口 → 组件 → 服务 → 工具”的主干路径。

```text
YiWeb/
  index.html                  # 根入口（当前为简单占位页）
  favicon.ico
  README.md                   # 项目介绍（仓库入口）

  docs/                       # 项目文档（入口：docs/00-README.md）
    00-README.md
    01-getting-started/
      01-quickstart.md
    02-architecture/
      01-overview.md
      02-directory-structure.md
    03-guides/
      01-networking.md
      02-components.md
    04-runbook/
      01-troubleshooting.md

  src/
    config.js                 # 环境/接口配置（注入 window.API_URL / window.DATA_URL 等）

    views/                    # 页面（每个页面通常有 index.html + index.js + index.css）
      news/                   # 智能新闻助手
        index.html
        index.js              # 页面主入口（createBaseView 装配组件）
        index.css
        hooks/                # 页面级 store / computed / methods
          store.js
          useComputed.js
          useMethods.js
      aicr/                   # 代码审查助手
        index.html
        index.js
        index.css
        hooks/                # 页面级 store / computed / methods
          store.js
          useComputed.js
          useMethods.js
        components/           # AICR 页面内组件（文件树、代码视图等）
          fileTree/
            index.css
            index.html
            index.js
          codeView/
            index.html
            index.js

    components/               # 可复用组件（通常 CSS/HTML/JS 分离）
      common/                 # 通用组件（搜索头、列表等）
        searchHeader/
          index.css
          index.html
          index.js
        baseModal/
          index.html
          index.js
        baseLoading/
          index.html
          index.js
        baseEmptyState/
          index.html
          index.js
        baseErrorState/
          index.html
          index.js
        baseIconButton/
          index.html
          index.js
      business/               # 业务组件（新闻列表等）
        newsList/
          index.css
          index.html
          index.js
        calendarView/
          index.css
          index.js
      calendar/               # 日历组件
        index.css
        index.html
        index.js
        calendar.css
        date-navigation.css

    services/                 # API / 业务服务层
      index.js                # 服务聚合出口
      modules/                # 面向资源/能力的 API 模块
        crud.js
        goals.js
      helper/                 # 请求/鉴权/错误处理等基础能力
        requestHelper.js
        apiUtils.js
        authUtils.js
        authErrorHandler.js
        checkStatus.js
      business/               # 业务流程/场景分析等
        businessProcessManager.js
        businessScenarioAnalyzer.js
        requirementAnalysisManager.js
      aicr/                   # AICR 相关服务
        sessionSyncService.js

    markdown/                 # Markdown 与 Mermaid 渲染
      index.js
      markdownRenderer.js
      markdownView/
        index.js              # MarkdownView 组件（用于 v-html 渲染）
      mermaid/
        mermaid.js
        mermaidRenderer.js

    utils/                    # 通用工具库
      index.js                # utils 聚合出口
      core/                   # 核心工具：日志、错误、通用方法、性能等
        log.js
        error.js
        common.js
        performance.js
        index.js
      view/                   # 视图装配与组件加载
        baseView.js
        componentLoader.js
        index.js
      browser/                # DOM/事件等浏览器工具
        dom.js
        events.js
        index.js
      time/                   # 时间/日期工具
        date.js
        timeParams.js
        timeSelectors.js
        index.js
      ui/                     # UI 工具：loading/message/template 等
        loading.js
        message.js
        template.js
      data/                   # 轻量数据/映射（如域名分类）
        domain.js
      io/                     # 导入导出等 I/O 相关工具
        exportUtils.js
      render/                 # 渲染辅助工具
        index.js
      aicr/                   # AICR 辅助工具
        fileFieldNormalizer.js

    styles/                   # 全局样式体系
      index.css
      base/                   # reset/排版/间距/主题等基础样式
        reset.css
        typography.css
        spacing.css
        theme.css
        display.css
        animations.css
      layout/
        layout.css
      components/             # 通用组件样式（button/input/message 等）
        button.css
        input.css
        message.css
        loading.css
        edit-card.css
        tag.css

    assets/                   # 资源文件
      prompts/                # 提示词/模板资源
        aicr/
          codereview.txt
          knowledgeCard.txt
        mermaid/
          autoFix.txt
        read/
          books.txt
```

## 读代码建议（从哪里开始）

- 页面入口：`src/views/**/index.html` → `src/views/**/index.js`
- 页面装配：[baseView.js](../../src/utils/view/baseView.js)
- 组件注册与模板加载：[componentLoader.js](../../src/utils/view/componentLoader.js)
- 请求与鉴权：[requestHelper.js](../../src/services/helper/requestHelper.js)、[authUtils.js](../../src/services/helper/authUtils.js)
