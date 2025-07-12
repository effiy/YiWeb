/**
 * 共享模块统一入口
 * author: liangliang
 * 
 * 提供所有共享资源的统一导出，简化其他模块的导入过程
 */

// 导入工具函数
export * from './utils/common.js';
export * from './utils/dom.js';
export * from './utils/events.js';

// 导入配置管理
export * from './config/index.js';

// 导入UI组件
export * from './components/index.js';

// 默认导出常用功能
export { default as utils } from './utils/common.js';
export { default as domUtils } from './utils/dom.js';
export { default as config } from './config/index.js';
export { default as components } from './components/index.js';

// 创建便捷访问对象
const Shared = {
    utils: () => import('./utils/common.js'),
    dom: () => import('./utils/dom.js'),
    events: () => import('./utils/events.js'),
    config: () => import('./config/index.js'),
    components: () => import('./components/index.js')
};

export default Shared; 