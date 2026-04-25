# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 5. 会话阻断通知（强制）

**任何会话被阻断时，必须通过 wework-bot 推送阻断消息，不得省略。**

适用场景（以下任意一种均视为"阻断"）：

- 缺少必要前置文档或输入，无法继续
- P0 门禁未通过且已达修复上限
- 必要工具 / MCP 不可用且无降级方案
- 用户请求无法解析或存在根本性歧义
- 任何 skill / agent 流程在中途因错误停止

**执行步骤：**

1. 记录阻断原因（简短，≤ 2 条）
2. 读取 `.claude/skills/wework-bot/SKILL.md`，按如下格式发送阻断通知：

```
⛔ 会话阻断
━━━━━━━━━━━━━━━━━
🛠️ 流程：<当前执行的 skill 或任务名>
📌 功能 / 任务：<功能名或任务简述>
📝 描述：<100字以内说明本次阻断背景和影响>
❌ 阻断原因：<简短原因，≤ 2 条>
📊 当前进度：<已完成阶段 / 总阶段，或"初始化阶段"如尚未进入>
🤖 模型：<模型名>
🧰 工具：<主要工具清单>
🕒 最后更新：<YYYY-MM-DD HH:mm:ss>
💡 恢复建议：<下一步操作或缺失输入>
```

3. 通知发送后才算阻断处理完成；发送失败时在回复中说明原因，并写入可落盘的总结或运行记录（包含脱敏路由、模型、工具和精确到秒的最后更新时间），但不因此阻断其他收尾操作。

> ⛔ **此规则优先级高于所有 skill 内部规则。即便某个 skill 未显式提及 wework-bot，会话阻断时也必须发送通知。**
