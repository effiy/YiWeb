> 消息通知列表 · 追加写入 · rui 管线自动维护

【2026-05-19 13:50:00】

【YiWeb】
🎯 结论: 完成 rui-story update 阶段
📝 描述: T2 增量更新 — HeaderActions 组件新增 API 鉴权按钮（showAuthButton prop + key icon），委托 window.openAuth 打开 API 设置对话框
📌 范围: cdn/components/business/HeaderActions/
👉 下一步: 合并到 main 分支
🌐 影响: story 页面 header-actions 自动获得 API 鉴权能力
📎 证据: feat/rui-story @ cdn/components/business/HeaderActions/index.js + template.html
⏱️ 会话: update 管线 1 turn

———

变更文件:
- cdn/components/business/HeaderActions/index.js (修改 · +12 -2 · 新增 showAuthButton prop + openAuth 方法)
- cdn/components/business/HeaderActions/template.html (修改 · +10 · 新增 API 鉴权按钮)

✅ 通知已发送 · 2026-05-19 13:50 · 企微 webhook
