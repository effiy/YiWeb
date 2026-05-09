---
paths:
  - "docs/故事任务面板/**/.improvement/**"
  - "docs/故事任务面板/**/.memory/**"
  - ".claude/skills/rui/scripts/**"
---

# Self-Improve Rules

1. 数据驱动: 提案必须有 snapshot 证据支撑，无数据不产出提案
2. H11 降级: 数据采集失败时跳过，不阻断交付
3. proposals.jsonl append-only，不删除历史记录
4. 效果评估至少需要前后各 3 条执行记忆才有中等置信度
5. 单次执行，不阻断主流程