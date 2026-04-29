# 构建与部署

## 构建流程

YiWeb 采用无构建工具架构，无需构建步骤。

### 环境要求

- 现代浏览器（支持 ES Modules）
- 本地 HTTP 服务器（开发用）

### 开发流程

1. 启动本地服务器：
```bash
# 使用 Python 3
python -m http.server 8000

# 或使用 Node
npx http-server

# 或使用 VS Code Live Server
```

2. 访问应用：http://localhost:8000/src/views/aicr/index.html

## 部署流程

### 静态文件部署

YiWeb 是纯静态应用，可以部署到任何静态文件托管服务：

- GitHub Pages
- Netlify
- Vercel
- 阿里云 OSS + CDN
- 腾讯云 COS
- Nginx / Apache

### 部署步骤

1. 准备部署目录：
```bash
# 直接使用仓库根目录
# 需要包含：src/、cdn/、index.html、favicon.ico 等
```

2. 配置环境变量：
- 修改 `src/core/config.js` 中的环境配置
- 或通过 URL 参数 `?env=prod` 切换环境

3. 上传文件到托管服务

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/YiWeb;
    index index.html;

    # 启用 gzip 压缩
    gzip on;
    gzip_types text/css application/javascript text/html;

    # 配置缓存
    location ~* \.(css|js|html|ico)$ {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # 支持 SPA 路由（如需要）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 运维监控

### 环境配置

`src/core/config.js` 支持多环境配置：

```javascript
// 本地环境
http://localhost:8000/src/views/aicr/index.html?env=local&debug=true

// 生产环境
https://your-domain.com/src/views/aicr/index.html?env=prod
```

### 日志

项目内置日志系统，支持按环境开关：

- 本地环境：默认启用调试日志
- 生产环境：默认关闭调试日志，只显示错误
- 强制开启：URL 参数 `?debug=true`

### 性能监控

`cdn/utils/core/performance.js` 提供性能监控工具：

```javascript
// 计时
timeStart('操作名');
// ... 代码
timeEnd('操作名'); // 输出耗时
```

> 待补充（原因：更多运维监控内容需要根据实际需求补充）

## 常见运维问题

### CORS 问题

**症状**：开发时 API 请求被 CORS 策略阻止

**原因**：本地服务器与 API 域名不同

**解决方案**：使用 CORS 代理或浏览器插件

### 缓存问题

**症状**：更新代码后浏览器不刷新

**解决方案**：
- 硬刷新（Ctrl + Shift + R）
- 或在开发时禁用缓存
- 生产环境使用版本化文件名或查询参数

### ES Modules 兼容性

**症状**：旧浏览器不支持 ES Modules

**解决方案**：
- 提示用户升级浏览器
- 或考虑使用构建工具（如 Vite）构建兼容性版本
