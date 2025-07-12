/**
 * 共享模块统一入口
 * author: liangliang
 * 
 * 提供所有共享资源的统一导出，简化其他模块的导入过程
 */

// 导入工具函数
export * from './js/utils/common.js';
export * from './js/utils/dom.js';
export * from './js/utils/events.js';

// 导入配置管理
export * from './js/config/index.js';

// 导入UI组件
export * from './js/components/index.js';

// 默认导出常用功能
export { default as utils } from './js/utils/common.js';
export { default as domUtils } from './js/utils/dom.js';
export { default as config } from './js/config/index.js';
export { default as components } from './js/components/index.js';

// 创建便捷访问对象
const Shared = {
    utils: () => import('./js/utils/common.js'),
    dom: () => import('./js/utils/dom.js'),
    events: () => import('./js/utils/events.js'),
    config: () => import('./js/config/index.js'),
    components: () => import('./js/components/index.js')
};

export default Shared; 