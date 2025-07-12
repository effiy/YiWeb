/**
 * 主页面配置模块
 * author: liangliang
 * 
 * 使用共享配置系统，避免重复定义
 */

// 导入统一的配置管理
import { 
    UI_CONFIG, 
    ANIMATION_CONFIG, 
    THEME_COLORS,
    BASE_CONFIG 
} from '../../shared/config/index.js';

// 主页面特定配置
export const CONFIG = {
    // 动画和交互配置 - 使用共享配置
    ANIMATION: ANIMATION_CONFIG.HOMEPAGE,
    
    // 文本框配置 - 使用共享配置
    MAX_TEXTAREA_HEIGHT: UI_CONFIG.HOMEPAGE_MAX_TEXTAREA_HEIGHT,
    
    // 防抖和节流配置 - 使用共享配置
    DEBOUNCE_DELAY: BASE_CONFIG.DEBOUNCE_DELAY,
    THROTTLE_DELAY: BASE_CONFIG.THROTTLE_DELAY
};

// 颜色主题配置 - 直接导出共享配置
export { THEME_COLORS };

// 便捷访问对象
export const HOMEPAGE_CONFIG = {
    ...CONFIG,
    COLORS: THEME_COLORS,
    ANIMATIONS: ANIMATION_CONFIG
}; 