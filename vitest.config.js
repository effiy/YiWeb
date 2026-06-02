import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // jsdom 模拟浏览器 API（window、document、localStorage 等）
    environment: 'jsdom',

    // 测试文件发现路径
    include: ['tests/**/*.test.js'],

    // 注入 describe、it、expect 等全局函数
    globals: true,
  },

  resolve: {
    alias: {
      // 项目使用绝对路径导入，映射到文件系统
      '/cdn': path.resolve(__dirname, 'cdn'),
      '/src': path.resolve(__dirname, 'src'),
      '/tests': path.resolve(__dirname, 'tests'),
    },
  },
});
