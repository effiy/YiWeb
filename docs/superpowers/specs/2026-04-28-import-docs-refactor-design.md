# import-docs 重构设计文档

**日期**：2026-04-28
**状态**：设计中

## 概述

重构 import-docs 技能，简化其默认行为，使其更符合项目使用场景。

## 核心需求

1. 默认导入当前项目根目录下的所有 md 文件
2. 如果当前目录是在 .claude 目录下，则导入 .claude 目录下的所有文件及目录
3. 无论从哪个目录开始导入，都会忽略该目录下的 .git 子目录
4. 保留 --dir 和 --exts 参数作为覆盖选项
5. 不保留向后兼容性，完全重写

## 核心逻辑流程

```
启动脚本
   ↓
确定项目根目录（从 cwd 向上查找 .git）
   ↓
判断当前目录是否在 .claude 路径下
   ↓
确定导入源和模式：
   ├─ 在 .claude 下 → 导入 .claude 目录，所有文件
   └─ 否则 → 导入项目根目录，仅 .md 文件
   ↓
遍历文件（始终忽略 .git 目录）
   ↓
执行导入（list 或 import）
```

## 详细规则

### 1. 目录查找规则

**项目根目录确定：**
- 从 `process.cwd()` 开始，逐级向上查找 `.git` 目录
- 找到 `.git` 目录时，其父目录即为项目根目录
- 若未找到 `.git` 目录，使用当前工作目录作为根目录

**.claude 目录检测：**
- 先确定项目根目录
- 检查当前工作目录是否是 `<项目根>/.claude` 或其子目录
- 仅当满足此条件时才判定为"在 .claude 目录下"

**导入源确定：**
- 在 .claude 下 → 导入源 = 项目根目录下的 `.claude` 目录
  - 如果项目根目录下不存在 `.claude` 目录，则回退到使用当前工作目录作为导入源
- 否则 → 导入源 = 项目根目录

### 2. 文件遍历与过滤规则

**通用忽略规则（始终生效）：**
- 所有名为 `.git` 的目录，无论出现在哪一层，都跳过不遍历
- 不跟随符号链接，避免循环引用

**在 .claude 模式下：**
- 导入所有文件，不限扩展名
- 递归遍历所有子目录（除 `.git` 外）
- 如果提供 `--exts`，会覆盖"全文件"行为，仅导入指定扩展名的文件

**在根目录模式下：**
- 仅导入扩展名为 `.md` 的文件
- 递归遍历所有子目录（除 `.git` 外）

### 3. 参数覆盖规则

如果提供 `--dir`：
- 使用该目录，不进行自动检测
- 此时如果目录名是 `.claude` 或 `.cursor` → 自动全文件导入
- 否则 → 按 `--exts` 过滤（默认 `md`）

如果提供 `--exts`：
- 覆盖默认扩展名，即使是在自动检测模式下
- 在 .claude 自动检测模式下，提供 `--exts` 会覆盖"全文件"行为，仅导入指定扩展名的文件

### 4. 命令与参数

```bash
# 默认 import 模式（自动检测）
node .claude/skills/import-docs/scripts/import-docs.js

# list 模式（仅列出文件）
node .claude/skills/import-docs/scripts/import-docs.js list

# 显示帮助
node .claude/skills/import-docs/scripts/import-docs.js --help
```

**支持的参数：**
- `--dir, -d`：覆盖自动检测的导入目录
- `--exts, -e`：覆盖默认的扩展名列表（逗号分隔）
- `--token, -t`：X-Token，默认从 `API_X_TOKEN` 环境变量读取
- `--api-url, -a`：API 地址，默认 `https://api.effiy.cn`
- `--prefix, -p`：路径前缀，逗号分隔

### 5. 远端路径生成规则

```
<prefix...>/<仓库目录名>/<导入目录名>/<相对文件路径>
```

细节：
- `prefix` 来自 `--prefix` 参数
- 仓库目录名 = 项目根目录的目录名
- 导入目录名 = 仅当 `--dir` 不是项目根目录时才添加
- 空格替换为 `_`，路径分隔符统一为 `/`

### 6. 错误处理与输出

**错误处理：**
- 单个文件失败时记录错误并继续处理后续文件
- 最终 `failed > 0` 时脚本以非零退出码结束
- 缺少 token 时停止执行（import 模式）
- 目录不存在时报错并退出
- 空目录或过滤后无文件时：输出提示信息并正常退出（退出码 0）

**输出信息：**
- 启动时显示：命令、导入目录、模式（全文件/仅 md）、API、前缀
- 处理时显示进度：`[N/total] Processing: <相对路径>`
- 完成后显示摘要：`Done: X created, Y overwritten, Z failed`

## 实现计划

1. 重写 `import-docs.js` 脚本
2. 更新 `SKILL.md` 文档
3. 更新 `README.md` 文档
4. 更新 `rules/import-contract.md` 文档
5. 测试验证
6. 与现有 skill 集成测试（generate-document / implement-code 调用）

## 不兼容变更

- 移除旧的默认行为（默认导入当前目录而非项目根）
- `--dir` 和 `--exts` 的语义简化
- `.cursor` 仅在 `--dir` 模式下识别，自动检测模式不处理 `.cursor`

## 向后兼容性

- 保留旧入口 `.claude/import-docs.js`，它会调用新脚本
- `generate-document` / `implement-code` 的标准调用方式 `--dir docs --exts md` 仍然有效
