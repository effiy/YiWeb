# YiWeb-00-消息通知列表

【2026-05-19 17:10:00】

【YiWeb】
🎯 结论: 完成 unify-icons code 阶段
📝 描述: 统一图标库：创建 iconMap.js 单一真相源 + YiIcon 语义化组件，全项目 57 个图标语义名映射，28 文件迁移完成
📌 范围: cdn/icons/ + src/views/aicr/ + src/views/storyPanel/ + cdn/components/
👉 下一步: 交付完毕，commit 变更
🌐 影响: docs/故事任务面板/unify-icons/
📎 证据: git diff --stat HEAD; grep audit 零硬编码 FA 类残留
⏱️ 会话: doc→code→交付 全流程 | 28 files changed

———

变更文件: 4 新增 (iconMap.js, YiIcon×3), 24 修改 (YiButton×2, YiErrorState×2, YiEmptyState×2, SearchHeader×2, domain.js, aicr×10, storyPanel×4)

【2026-05-19 17:25:00】

【YiWeb】
🎯 结论: 完成 unify-icons T2 修复
📝 描述: YiIcon 从 Options API computed 转为 setup() + Vue.computed()，修复 storyPanel 图标不显示问题
📌 范围: cdn/icons/YiIcon/index.js
❌ 原因: Options API this.name 在某些环境下无法正确解析 props
🧭 恢复点: 组件已改为 setup() 模式，与 SearchHeader 一致
🌐 影响: cdn/icons/YiIcon/index.js
📎 证据: setup(props) 直接访问 props 参数

———

变更: 1 修改 (YiIcon/index.js)
