# 常见问题与自愈

## 开发问题

### Q: 页面加载空白，控制台显示模块加载错误

**原因**: 本地服务器未启动或路径错误。

**解决**:
```bash
cd /var/www/YiWeb
python -m http.server 8000
```
确保访问 `http://localhost:8080/src/views/aicr/index.html`

### Q: CORS 错误

**原因**: 前端页面域名与 API 域名不一致。

**解决**:
- 本地开发时确保 API 服务允许 `localhost:8080`
- 检查 `src/core/config.js` 中的端点配置

### Q: Vue 组件未注册

**原因**: `createBaseView` 的 `components` 列表遗漏了组件名。

**解决**: 检查 `src/views/aicr/index.js` 中的 `components` 数组。

### Q: Store 状态不响应

**原因**: 直接赋值而非通过 `.value`。

**解决**:
```javascript
// 错误
store.sessions = newSessions;

// 正确
store.sessions.value = newSessions;
```

## 环境问题

### Q: 如何切换环境？

**方式一**（URL 参数）：
```
?env=local
```

**方式二**（localStorage）：
```javascript
localStorage.setItem('env', 'local');
location.reload();
```

**方式三**（JS API）：
```javascript
window.setEnv('local');
```

### Q: 调试模式如何开启？

```
?debug=true
```

或

```javascript
localStorage.setItem('debug', 'true');
location.reload();
```

## 功能问题

### Q: AI 聊天无响应

**排查步骤**:
1. 检查网络连接
2. 确认 OLLAMA_URL 可访问
3. 查看控制台是否有错误
4. 确认 Token 有效（`getStoredToken()`）

### Q: 文件树不显示

**排查步骤**:
1. 检查 API 返回数据格式
2. 查看 `normalizeTreeNode` 是否正常处理
3. 确认 `loadFileTree` 已调用

## Postscript: Future Planning & Improvements

- 添加更详细的错误码说明
- 提供自助诊断工具
