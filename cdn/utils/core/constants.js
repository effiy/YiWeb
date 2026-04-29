/**
 * YiWeb 项目常量定义
 * 集中管理所有魔法数字、超时时间、配置常量等
 * author: Claude Code
 */

// ========== 超时时间配置 ==========
export const TIMEOUTS = {
    /** 组件加载超时时间（毫秒） */
    COMPONENT_LOAD: 60000,
    /** 快速轮询间隔（毫秒） */
    POLL_FAST: 50,
    /** 普通轮询间隔（毫秒） */
    POLL_NORMAL: 100,
    /** 短日志输出间隔（毫秒） */
    LOG_INTERVAL_SHORT: 2000,
    /** 长日志输出间隔（毫秒） */
    LOG_INTERVAL_LONG: 5000
};

// ========== 防抖时间配置 ==========
export const DEBOUNCE = {
    /** 侧边栏调整防抖时间（毫秒） */
    SIDEBAR_RESIZE: 50,
    /** 搜索输入防抖时间（毫秒） */
    SEARCH_INPUT: 300
};

// ========== 缓存配置 ==========
export const CACHE = {
    /** 模板缓存最大年龄（毫秒），7 天 */
    TEMPLATE_MAX_AGE: 7 * 24 * 60 * 60 * 1000
};

// ========== 组件相关常量 ==========
export const COMPONENTS = {
    /** 侧边栏最小宽度（像素） */
    SIDEBAR_MIN_WIDTH: 240,
    /** 侧边栏最大宽度（像素） */
    SIDEBAR_MAX_WIDTH: 400,
    /** 侧边栏默认宽度（像素） */
    SIDEBAR_DEFAULT_WIDTH: 320,
    /** 聊天面板最小宽度（像素） */
    CHAT_PANEL_MIN_WIDTH: 280,
    /** 聊天面板最大宽度（像素） */
    CHAT_PANEL_MAX_WIDTH: 980,
    /** 聊天面板默认宽度（像素） */
    CHAT_PANEL_DEFAULT_WIDTH: 420
};

// ========== 存储键名 ==========
export const STORAGE_KEYS = {
    /** AICR 侧边栏宽度 */
    AICR_SIDEBAR_WIDTH: 'aicrSidebarWidth',
    /** AICR 聊天面板宽度 */
    AICR_CHAT_PANEL_WIDTH: 'aicrChatPanelWidth'
};

// ========== 事件名称 ==========
export const EVENTS = {
    /** 高亮代码行 */
    HIGHLIGHT_CODE_LINES: 'highlightCodeLines',
    /** 清除高亮 */
    CLEAR_CODE_HIGHLIGHT: 'clearCodeHighlight',
    /** 项目就绪 */
    PROJECT_READY: 'projectReady',
    /** 模态框 ESC 按键 */
    MODAL_ESC_PRESSED: 'modalEscPressed'
};

// ========== 窗口暴露的对象名 ==========
export const WINDOW_EXPOSE_NAMES = {
    /** AICR 应用实例 */
    AICR_APP: 'aicrApp',
    /** AICR 存储 */
    AICR_STORE: 'aicrStore',
    /** AICR 挂载的监听器 */
    AICR_MOUNTED_LISTENERS: '__aicrMountedListeners',
    /** AICR 清理监听器函数 */
    AICR_CLEANUP_MOUNTED_LISTENERS: '__aicrCleanupMountedListeners',
    /** AICR 待处理文件键 */
    AICR_PENDING_FILE_KEY: '__aicrPendingFileKey',
    /** AICR 待处理高亮范围信息 */
    AICR_PENDING_HIGHLIGHT_RANGE_INFO: '__aicrPendingHighlightRangeInfo'
};

// ========== 通用常量 ==========
export const COMMON = {
    /** 空字符串 */
    EMPTY_STRING: '',
    /** 默认的空格字符 */
    SPACE: ' ',
    /** 斜杠路径分隔符 */
    PATH_SEPARATOR: '/',
    /** 横线分隔符 */
    HYPHEN: '-',
    /** 下划线分隔符 */
    UNDERSCORE: '_',
    /** 冒号分隔符 */
    COLON: ':',
    /** 点分隔符 */
    DOT: '.'
};

// 暴露到全局（为了向后兼容）
if (typeof window !== 'undefined') {
    window.TIMEOUTS = TIMEOUTS;
    window.DEBOUNCE = DEBOUNCE;
    window.CACHE = CACHE;
    window.COMPONENTS = COMPONENTS;
    window.STORAGE_KEYS = STORAGE_KEYS;
    window.EVENTS = EVENTS;
    window.WINDOW_EXPOSE_NAMES = WINDOW_EXPOSE_NAMES;
    window.COMMON = COMMON;
}

// ES6 模块导出
export default {
    TIMEOUTS,
    DEBOUNCE,
    CACHE,
    COMPONENTS,
    STORAGE_KEYS,
    EVENTS,
    WINDOW_EXPOSE_NAMES,
    COMMON
};
