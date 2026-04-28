# Changelog

本文件记录项目的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增

- `/generate-document init` 功能：生成项目基础文档和初始化文档集
- 增强 `generate-document` 技能：强制全文档生成，规范驱动
- 增强 `wework-bot` 技能：会话指标和动态通知文案
- 完善 Agent 系统：`architect`、`planner`、`impact-analyst` 等

### 变更

- 重构 `message-pusher` Agent：改进消息起草和验证流程
- 更新 `.claude/shared/document-contracts.md`：完善影响分析契约
- 整理 `.claude/skills/` 目录：移除过时技能，更新文档

### 修复

- 修复组件加载时序问题：同步注册 + 异步模板加载
- 修复文件树更新逻辑：确保状态同步

## [0.1.0] - 2026-04-28

### 新增

- AI 代码审查页面（AICR）：会话管理、文件树、聊天功能
- 核心架构：`createBaseView` 视图工厂 + hooks 状态管理模式
- CDN 组件库：通用组件（按钮、模态框、表单）、业务组件
- 工具函数：日志、错误处理、DOM 操作、性能监控
- Markdown 渲染系统：插件化架构，支持自定义插件
- Mermaid 图表渲染：集成图表渲染和 AI 修复
- 项目文档结构：`docs/` 目录和相关规范
- Claude 配置：`.claude/` 目录，包含 Agent、Skills、Rules

### 技术栈

- Vue 3 (CDN)
- 原生 ES Modules
- 无需构建工具

[Unreleased]: https://github.com/your-repo/YiWeb/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-repo/YiWeb/releases/tag/v0.1.0
