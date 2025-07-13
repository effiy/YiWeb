/**
 * 共享模块统一入口
 * author: liangliang
 * 
 * 提供所有共享资源的统一导出，简化其他模块的导入过程
 */

// 导入工具函数
export * from './base/utils/common.js';
export * from './base/utils/dom.js';
export * from './base/utils/events.js';

// 导入配置管理
export * from './base/index.js';

// 导入UI组件
export * from './components/index.js';

// 默认导出常用功能
export { default as utils } from './base/utils/common.js';
export { default as domUtils } from './base/utils/dom.js';
export { default as config } from './base/index.js';
export { default as components } from './components/index.js';

// 创建便捷访问对象
const Shared = {
    utils: () => import('./base/utils/common.js'),
    dom: () => import('./base/utils/dom.js'),
    events: () => import('./base/utils/events.js'),
    config: () => import('./base/index.js'),
    components: () => import('./components/index.js')
};

export default Shared; 