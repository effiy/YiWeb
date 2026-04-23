/**
 * 优化后的工具函数索引
 * author: liangliang
 */

// 核心工具
export * from '/cdn/utils/core/index.js';

// 浏览器工具
export * from '/cdn/utils/browser/index.js';

// 时间工具
export * from '/cdn/utils/time/index.js';

// 视图工具
export * from '/src/core/utils/view/index.js';

// 渲染工具
export * from '/cdn/utils/render/index.js';

// 数据工具
export * from '/cdn/utils/data/domain.js';

// IO工具
export * from '/cdn/utils/io/exportUtils.js';

// UI工具
export * from '/cdn/utils/ui/loading.js';
export * from '/cdn/utils/ui/message.js';
export * from '/cdn/utils/ui/template.js';

// 导出常用工具的快捷访问
export { storage, sessionStorage, cookie } from '/cdn/utils/core/storage.js';
export { eventBus } from '/cdn/utils/core/eventBus.js';
export { default as http } from '/cdn/utils/core/http.js';
export { default as animation } from '/cdn/utils/core/animation.js';
export { default as validation } from '/cdn/utils/core/validation.js';
export { default as performance } from '/cdn/utils/core/performance.js';
