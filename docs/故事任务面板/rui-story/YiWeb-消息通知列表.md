【2026-05-20 09:30:00】

【YiWeb】
🎯 结论: 完成 rui-story update 阶段
📝 描述: story 页面状态判定与类型推断对齐 rui-story.mjs 规范 — 基于语义文档名替代数字编号前缀，类型推断通过远端 API 读取技术评审内容
📌 范围: src/views/story/hooks/store.js + src/core/config.js
👉 下一步: 验证 story 页面在浏览器中的实际展示效果
🌐 影响: src/views/story/hooks/store.js (重写), src/core/config.js (新增 PROJECT_NAME)
📎 证据: git diff feat/rui-story
⏱️ 会话: update 管线 ~2min | 2 files changed, 184 insertions, 63 deletions

———

变更详情:
- store.js: 重写 determineStatus() 使用 {project}-故事任务.md 等语义名称匹配，废弃数字前缀 -01-/-02- 模式
- store.js: 新增 inferType() 通过 /read-file API 读取技术评审文档内容推断类型 (backend/frontend/fullstack/meta)
- store.js: 新增 checkBlockedState() 检查远端 .memory/rui-state.json 获取阻断状态
- store.js: 通知/日志检测改用 消息通知列表.md / 交互日志.md 语义名称
- config.js: 新增 PROJECT_NAME=YiWeb 全局配置供 store.js 使用
