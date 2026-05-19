# YiWeb-00-消息通知列表

## unified-refresh-button

【2026-05-19 11:00:00】

【YiWeb】
🎯 结论: 完成 unified-refresh-button doc+code 管线
📝 描述: 统一刷新按钮操作：硬刷新机制升级，清除全部浏览器存储后使用缓存爆破 URL 导航绕过 HTTP 磁盘缓存
📌 范围: docs/故事任务面板/unified-refresh-button/
👉 下一步: 用户手动验证 TC1-TC12 测试用例
🌐 影响: docs/故事任务面板/unified-refresh-button/YiWeb-01-故事任务.md (新增) · YiWeb-02-用户使用场景.md (新增) · YiWeb-04-前端技术评审.md (新增) · YiWeb-05-测试用例评审.md (新增)
📎 证据: src/views/aicr/hooks/clearCacheMethods.js — hardReload() 替代 location.reload()
⏱️ 会话: doc 4 文档 + code 1 文件 | 1 agent 参与

———

变更文件: src/views/aicr/hooks/clearCacheMethods.js (修改, 提取 hardReload 函数)
