# YiWeb 统一物料库

这是所有 Yi 系列项目的共享资源库，包含通用组件、工具函数、样式和图表支持。

## 📦 资源目录

```
shared/
├── components/     # 通用组件库
│   ├── index.js   # 组件 JavaScript
│   └── index.css  # 组件样式
├── utils/         # 工具函数库
│   └── index.js   # 工具函数
├── styles/        # 通用样式
│   └── theme.css  # 主题样式
└── mermaid/       # Mermaid 图表
    ├── index.js   # 主入口
    ├── config.js  # 配置
    ├── renderer.js # 渲染器
    └── ...
```

## 🚀 使用方式

### CDN 引用（推荐）

```javascript
// 引入组件
import { createButton, createModal, createTag } from 'https://effiy.cn/shared/components/index.js';

// 引入工具函数
import { escapeHtml, generateId, debounce } from 'https://effiy.cn/shared/utils/index.js';

// 引入 Mermaid
import mermaid from 'https://effiy.cn/shared/mermaid/index.js';
```

```html
<!-- 引入样式 -->
<link rel="stylesheet" href="https://effiy.cn/shared/styles/theme.css">
<link rel="stylesheet" href="https://effiy.cn/shared/components/index.css">
```

### 本地开发

```bash
# 创建软链接
ln -s /var/www/YiWeb/shared /var/www/YourProject/shared
```

```javascript
// 使用相对路径
import { createButton } from './shared/components/index.js';
```

## 📚 API 文档

### Components 组件库

#### createButton(options)
创建按钮组件

```javascript
const button = createButton({
  text: '点击我',
  variant: 'primary',  // primary | secondary | success | warning | danger
  size: 'md',          // sm | md | lg
  icon: '🚀',
  disabled: false,
  loading: false,
  onclick: () => console.log('clicked')
});
```

#### createModal(options)
创建模态框

```javascript
const modal = createModal({
  title: '标题',
  content: '内容',
  footer: '底部内容',
  width: '500px',
  onClose: () => console.log('closed')
});
```

#### createTag(options)
创建标签

```javascript
const tag = createTag({
  text: '标签',
  variant: 'primary',
  size: 'md',
  closable: false
});
```

#### createLoading(options)
创建加载动画

```javascript
const loading = createLoading({
  size: 'md',
  text: '加载中...'
});
```

### Utils 工具函数

#### HTML 处理
- `escapeHtml(str)` - HTML 转义
- `unescapeHtml(str)` - HTML 反转义
- `escapeHtmlAttr(str)` - HTML 属性转义
- `escapeJs(str)` - JavaScript 字符串转义

#### ID 生成
- `generateId(prefix)` - 生成唯一 ID
- `uuid()` - 生成 UUID

#### 防抖节流
- `debounce(fn, delay)` - 防抖
- `throttle(fn, delay)` - 节流

#### 日期处理
- `formatDate(date, format)` - 格式化日期
- `parseDate(str)` - 解析日期
- `getRelativeTime(date)` - 获取相对时间

#### 数组操作
- `unique(arr)` - 数组去重
- `flatten(arr)` - 数组扁平化
- `chunk(arr, size)` - 数组分块
- `shuffle(arr)` - 数组随机排序

#### 对象操作
- `deepClone(obj)` - 深拷贝
- `deepMerge(target, ...sources)` - 深度合并
- `pick(obj, keys)` - 选取属性
- `omit(obj, keys)` - 排除属性

#### 存储
- `setStorage(key, value)` - 设置存储
- `getStorage(key)` - 获取存储
- `removeStorage(key)` - 删除存储
- `clearStorage()` - 清空存储

#### 验证
- `isEmail(str)` - 验证邮箱
- `isPhone(str)` - 验证手机号
- `isUrl(str)` - 验证 URL
- `isIdCard(str)` - 验证身份证

#### 动画
- `animate(element, keyframes, options)` - 动画
- `fadeIn(element, duration)` - 淡入
- `fadeOut(element, duration)` - 淡出
- `slideDown(element, duration)` - 下滑
- `slideUp(element, duration)` - 上滑

### Mermaid 图表

```javascript
import mermaid from 'https://effiy.cn/shared/mermaid/index.js';

// 初始化
mermaid.initialize({
  theme: 'dark',
  startOnLoad: true
});

// 渲染图表
const svg = await mermaid.render('graphDiv', 'graph TD; A-->B;');
```

## 🎨 样式变量

```css
/* 主题色 */
--primary: #667eea;
--secondary: #764ba2;
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;
--error: #ef4444;

/* 背景色 */
--bg-primary: #0f172a;
--bg-secondary: #1e293b;
--bg-tertiary: #334155;

/* 文字色 */
--text-primary: #f8fafc;
--text-secondary: #cbd5e1;
--text-tertiary: #94a3b8;

/* 边框色 */
--border-primary: rgba(255,255,255,0.12);
--border-secondary: rgba(255,255,255,0.08);
```

## 📋 完整示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YiWeb 物料库示例</title>

  <!-- 引入样式 -->
  <link rel="stylesheet" href="https://effiy.cn/shared/styles/theme.css">
  <link rel="stylesheet" href="https://effiy.cn/shared/components/index.css">
</head>
<body>
  <div id="app"></div>

  <script type="module">
    // 引入组件和工具
    import { createButton, createModal } from 'https://effiy.cn/shared/components/index.js';
    import { escapeHtml, debounce } from 'https://effiy.cn/shared/utils/index.js';

    // 创建按钮
    const button = createButton({
      text: '打开模态框',
      variant: 'primary',
      onclick: () => {
        // 创建模态框
        const modal = createModal({
          title: '欢迎使用 YiWeb 物料库',
          content: '<p>这是一个统一的组件和工具库</p>',
          footer: createButton({ text: '关闭', onclick: () => modal.close() })
        });
        modal.show();
      }
    });

    // 添加到页面
    document.getElementById('app').innerHTML = button;

    // 使用工具函数
    const handleSearch = debounce((keyword) => {
      console.log('搜索:', escapeHtml(keyword));
    }, 300);
  </script>
</body>
</html>
```

## ⚠️ 注意事项

1. **向后兼容**: 修改代码时保持向后兼容，避免破坏现有项目
2. **测试**: 重大更新前在测试环境验证
3. **版本控制**: 重要更新使用 Git Tag 标记版本
4. **缓存**: 浏览器会缓存资源（1年），更新后可能需要强制刷新
5. **影响范围**: 修改会影响所有使用该资源的项目

## 🔄 版本管理

### 创建版本标签
```bash
git tag -a shared-v1.0.0 -m "Shared library v1.0.0"
git push origin shared-v1.0.0
```

### 使用特定版本（需要配置 nginx 支持）
```javascript
// 使用最新版本（默认）
import { createButton } from 'https://effiy.cn/shared/components/index.js';

// 使用特定版本（需要额外配置）
// import { createButton } from 'https://effiy.cn/shared@v1.0.0/components/index.js';
```

## 📊 缓存策略

- **静态资源** (JS/CSS): 1年缓存，immutable
- **HTML 文件**: 禁用缓存
- **支持**: ETag 和 Last-Modified

## 🤝 贡献指南

1. 在 YiWeb 项目中修改 shared 目录
2. 充分测试修改
3. 提交 commit 并推送
4. 如果是重大更新，创建版本标签

## 📞 联系方式

- 仓库: https://github.com/effiy/YiWeb
- CDN: https://effiy.cn/shared/

---

**最后更新**: 2026-02-26
**版本**: 1.0.0
