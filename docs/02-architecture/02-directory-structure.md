# YiWeb 目录结构

以下目录结构以项目根目录为起点，列出仓库内全部文件，并在每个文件后标注行数（按文件内容 splitlines 统计）。

统计口径：

- 文件数：160
- 总行数：46892

```text
YiWeb/
  .gitignore  # 28 lines
  docs/
    01-getting-started/
      01-quickstart.md  # 92 lines
    02-architecture/
      01-overview.md  # 73 lines
      02-directory-structure.md  # 242 lines
    03-guides/
      01-networking.md  # 88 lines
      02-components.md  # 154 lines
    04-runbook/
      01-troubleshooting.md  # 89 lines
    00-README.md  # 34 lines
  favicon.ico  # 20 lines
  index.html  # 10 lines
  src/
    assets/
      icons/
      prompts/
        aicr/
          codereview.txt  # 39 lines
          knowledgeCard.txt  # 160 lines
        mermaid/
          autoFix.txt  # 44 lines
        read/
          books.txt  # 112 lines
    components/
      business/
        calendarView/
          index.css  # 634 lines
          index.js  # 578 lines
        newsList/
          index.css  # 563 lines
          index.html  # 226 lines
          index.js  # 258 lines
      calendar/
        calendar.css  # 337 lines
        date-navigation.css  # 305 lines
        index.css  # 2 lines
        index.html  # 99 lines
        index.js  # 69 lines
      common/
        searchHeader/
          index.css  # 877 lines
          index.html  # 130 lines
          index.js  # 346 lines
        yiButton/
          index.html  # 24 lines
          index.js  # 111 lines
        yiEmptyState/
          index.html  # 27 lines
          index.js  # 56 lines
        yiErrorState/
          index.html  # 18 lines
          index.js  # 45 lines
        yiIconButton/
          index.html  # 11 lines
          index.js  # 37 lines
        yiLoading/
          index.html  # 6 lines
          index.js  # 32 lines
        yiModal/
          index.html  # 7 lines
          index.js  # 51 lines
        yiTag/
          index.html  # 15 lines
          index.js  # 87 lines
    config.js  # 103 lines
    markdown/
      index.js  # 1 lines
      markdownRenderer.js  # 1448 lines
      markdownView/
        index.js  # 44 lines
      mermaid/
        mermaid.js  # 1483 lines
        mermaidRenderer.js  # 1662 lines
    services/
      aicr/
        sessionSyncService.js  # 845 lines
      business/
        businessProcessManager.js  # 302 lines
        businessScenarioAnalyzer.js  # 157 lines
        requirementAnalysisManager.js  # 37 lines
      helper/
        apiUtils.js  # 143 lines
        authErrorHandler.js  # 240 lines
        authUtils.js  # 372 lines
        checkStatus.js  # 99 lines
        requestHelper.js  # 607 lines
      index.js  # 74 lines
      modules/
        crud.js  # 802 lines
        goals.js  # 103 lines
    styles/
      base/
        animations.css  # 714 lines
        display.css  # 231 lines
        reset.css  # 354 lines
        spacing.css  # 230 lines
        theme.css  # 186 lines
        typography.css  # 442 lines
      components/
        button.css  # 253 lines
        edit-card.css  # 394 lines
        input.css  # 346 lines
        loading.css  # 366 lines
        message.css  # 384 lines
        tag.css  # 56 lines
      index.css  # 26 lines
      layout/
        layout.css  # 112 lines
      utils/
        typography.css  # 2 lines
    utils/
      aicr/
        fileFieldNormalizer.js  # 221 lines
      browser/
        dom.js  # 371 lines
        events.js  # 545 lines
        index.js  # 2 lines
      core/
        common.js  # 386 lines
        error.js  # 558 lines
        index.js  # 3 lines
        log.js  # 119 lines
        performance.js  # 362 lines
      data/
        domain.js  # 333 lines
      index.js  # 11 lines
      io/
        exportUtils.js  # 423 lines
      render/
        index.js  # 3 lines
      time/
        date.js  # 176 lines
        index.js  # 3 lines
        timeParams.js  # 321 lines
        timeSelectors.js  # 148 lines
      ui/
        loading.js  # 121 lines
        message.js  # 34 lines
        messageCore.js  # 615 lines
        template.js  # 20 lines
      view/
        baseView.js  # 447 lines
        componentLoader.js  # 121 lines
        index.js  # 2 lines
    views/
      aicr/
        components/
          aicrCodeArea/
            index.html  # 202 lines
            index.js  # 9 lines
          aicrHeader/
            index.html  # 21 lines
            index.js  # 9 lines
          aicrModals/
            index.html  # 495 lines
            index.js  # 9 lines
          aicrPage/
            index.html  # 6 lines
            index.js  # 6 lines
          aicrSidebar/
            index.html  # 62 lines
            index.js  # 9 lines
          codeView/
            index.html  # 223 lines
            index.js  # 492 lines
          fileTree/
            fileTreeComponent.js  # 90 lines
            fileTreeComputed.js  # 160 lines
            fileTreeLayout.css  # 483 lines
            fileTreeMethods.js  # 341 lines
            fileTreeNode.js  # 575 lines
            fileTreeTags.css  # 318 lines
            fileTreeTreeBase.css  # 137 lines
            fileTreeTreeExtras.css  # 416 lines
            fileTreeUtils.js  # 46 lines
            index.css  # 4 lines
            index.html  # 234 lines
            index.js  # 4 lines
        hooks/
          methods/
          authDialogMethods.js  # 253 lines
          fileDeleteService.js  # 212 lines
          fileTreeCrudMethods.js  # 282 lines
          folderTransferMethods.js  # 394 lines
          mainPageMethods.js  # 520 lines
          projectZipMethods.js  # 703 lines
          sessionActionMethods.js  # 640 lines
          sessionChatContextChatMethods.js  # 1292 lines
          sessionChatContextContextMethods.js  # 457 lines
          sessionChatContextMethods.js  # 926 lines
          sessionChatContextSettingsMethods.js  # 93 lines
          sessionChatContextShared.js  # 1118 lines
          sessionEditMethods.js  # 472 lines
          sessionFaqMethods.js  # 547 lines
          sessionListMethods.js  # 843 lines
          store.js  # 3 lines
          storeFactory.js  # 67 lines
          storeFileContentOps.js  # 346 lines
          storeFileTreeBuilders.js  # 112 lines
          storeFileTreeOps.js  # 676 lines
          storeSessionsOps.js  # 143 lines
          storeState.js  # 221 lines
          storeUiOps.js  # 106 lines
          tagManagerMethods.js  # 767 lines
          useComputed.js  # 270 lines
          useMethods.js  # 669 lines
        codePage.css  # 1591 lines
        index.css  # 519 lines
        index.html  # 50 lines
        index.js  # 667 lines
        layout.css  # 653 lines
        welcomeCard.css  # 242 lines
      news/
        hooks/
          store.js  # 896 lines
          useComputed.js  # 365 lines
          useMethods.js  # 624 lines
        index.css  # 276 lines
        index.html  # 381 lines
        index.js  # 46 lines
```

## 读代码建议（从哪里开始）

- 页面入口：`src/views/**/index.html` → `src/views/**/index.js`
- 页面装配：[baseView.js](../../src/utils/view/baseView.js)
- 组件注册与模板加载：[componentLoader.js](../../src/utils/view/componentLoader.js)
- 请求与鉴权：[requestHelper.js](../../src/services/helper/requestHelper.js)、[authUtils.js](../../src/services/helper/authUtils.js)
