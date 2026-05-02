# 认证鉴权方案

## 当前状态

本项目采用基于 Token 的简单认证机制。

## Token 管理

### 存储位置

Token 存储在 `localStorage` 中：

```javascript
localStorage.setItem('auth_token', token);
```

### 工具函数

`src/core/services/helper/authUtils.js` 提供：

```javascript
getStoredToken()     // 获取存储的 Token
saveToken(token)     // 保存 Token
clearToken()         // 清除 Token
openAuth()           // 打开认证设置
```

## 请求中的认证

### 请求拦截器自动附加

`src/core/services/helper/requestHelper.js` 在发起请求时自动从 `localStorage` 读取 Token 并附加到请求头：

```javascript
headers['Authorization'] = `Bearer ${token}`;
```

### 401 处理

当 API 返回 401 时：
- 清除本地 Token
- 弹出认证对话框
- 提示用户重新登录

## 认证对话框

AICR 页面提供内置的认证设置对话框，支持：
- 手动输入 Token
- 测试连接
- 保存/清除凭证

## 调试认证

```javascript
// 查看当前 Token
getStoredToken()

// 手动设置 Token
saveToken('your-token-here')

// 清除 Token
clearToken()
```

## Postscript: Future Planning & Improvements

- 考虑支持多认证方式（OAuth、API Key）
- 添加 Token 过期自动刷新机制
- 评估是否需要更安全的 Token 存储方案（如内存存储）
