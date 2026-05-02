# 04 使用文档 - 项目初始化

## 快速开始

### 启动开发服务器

```bash
cd /var/www/YiWeb
python -m http.server 8000
```

### 访问应用

- AICR: http://localhost:8000/src/views/aicr/index.html

### 环境切换

| 方式 | 操作 | 生效范围 |
|------|------|---------|
| URL 参数 | `?env=local` | 当前页面 |
| localStorage | `localStorage.setItem('env', 'local')` | 持久化 |
| JS API | `window.setEnv('local')` | 持久化 + 刷新 |

## 开发规范速查

### 命名

```javascript
// 变量/函数 - camelCase
const fileTree = [];
function loadSessions() { }

// 组件 - PascalCase
export default { name: 'AicrPage' };

// 常量 - UPPER_SNAKE_CASE
const ENDPOINTS = { local: {}, prod: {} };

// CSS - kebab-case
.aicr-sidebar { }
```

### 模块导入

```javascript
// 正确 - 绝对路径
import { createBaseView } from '/cdn/utils/view/baseView.js';
import { config } from '/src/core/config.js';

// 错误 - 相对路径
import { foo } from './bar.js';
```

### 组件注册

```javascript
createBaseView({
    components: ['YiButton', 'YiModal'],
    componentModules: [
        '/cdn/components/common/buttons/YiButton/index.js',
        '/cdn/components/common/modals/YiModal/index.js'
    ]
});
```

### 错误处理

```javascript
import { safeExecute, safeExecuteAsync } from '/cdn/utils/core/error.js';

// 同步
const result = safeExecute(() => riskyOperation(), fallbackValue);

// 异步
const data = await safeExecuteAsync(() => fetchData(), []);
```

## 调试指南

### 开启调试模式

```
?debug=true
```

### 全局调试对象

```javascript
// 查看环境配置
window.__ENV__

// 查看 Store 状态
window.aicrStore

// 切换环境
window.setEnv('local')
window.setEnv('prod')

// 构建 URL
window.buildApiUrl('/sessions')
window.buildDataUrl('/files')
```

### 日志级别

```javascript
import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';

logInfo('信息');
logWarn('警告');
logError('错误');
```

## 文档生成工具

### 生成功能文档

```
/generate-document <功能名>-描述
```

示例：
```
/generate-document user-login-phone-otp
```

### 初始化项目文档

```
/generate-document init
```

### 实施代码

```
/implement-code <功能名>
```

## Postscript: Future Planning & Improvements

- 补充更多开发场景示例
- 添加组件使用示例集合
