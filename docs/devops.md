# 构建、部署与运维

## 开发环境

### 启动本地服务器

```bash
cd /var/www/YiWeb
python -m http.server 8000
```

### 访问应用

- AICR: http://localhost:8000/src/views/aicr/index.html
- 根页面: http://localhost:8000/

### 环境切换

| 方式 | 操作 |
|------|------|
| URL 参数 | `?env=local` |
| localStorage | `localStorage.setItem('env', 'local')` |
| JS API | `window.setEnv('local')` |

## 项目特性

- **零构建**：浏览器直接运行 ES 模块，无需打包工具
- **无依赖安装**：不依赖 npm/yarn，所有外部依赖通过 CDN 加载
- **静态部署**：可直接部署到任何静态文件服务器

## 外部依赖（CDN）

| 依赖 | 版本 | 来源 |
|------|------|------|
| Vue | 3.5.26 | jsDelivr |
| Marked.js | 9.1.6 | jsDelivr |
| Mermaid | 10.9.1 | jsDelivr |
| Font Awesome | 6.4.0 | cdnjs |

## 文件组织

### 开发结构 = 部署结构

无需构建步骤，源码目录即部署目录：

```
cdn/     → 直接作为静态资源
src/     → 直接作为静态资源
docs/    → 可选部署（文档站点）
index.html → 入口
```

## 生产部署建议

### 静态托管

适合部署到：
- Nginx / Apache 静态目录
- Cloudflare Pages
- GitHub Pages
- Vercel / Netlify

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name yiweb.example.com;
    root /var/www/YiWeb;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 缓存静态资源
    location ~* \.(js|css|png|jpg|ico)$ {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 监控与日志

### 性能监控

`cdn/utils/core/performance.js` 提供基础性能指标采集。

### 调试模式

```javascript
// 开启调试
?debug=true

// 或 localStorage
localStorage.setItem('debug', 'true');
```

调试模式下：
- 控制台输出详细日志
- 暴露 `window.__ENV__` 环境信息
- 暴露 `window.aicrStore` 状态对象

## 版本管理

当前项目通过 Git 管理版本，无版本号系统。

## Postscript: Future Planning & Improvements

- 添加自动化测试（Playwright E2E）
- 考虑引入 Vite 进行开发时热更新（保持零构建部署）
- 添加 CI/CD 流水线自动部署
