/**
 * AICR 模块常量配置
 * 集中管理魔法字符串、魔法数字和配置项
 */

// 标签相关常量
export const TAGS = {
    KNOWLEDGE: 'knowledge'
};

// 时间相关常量（毫秒）
export const TIMEOUTS = {
    IMMEDIATE: 0,
    SHORT_DELAY: 50,
    DEFAULT_DELAY: 100,
    MODERATE_DELAY: 200,
    LONG_DELAY: 300,
    UI_FEEDBACK_DELAY: 500,
    ONE_SECOND: 1000,
    HIGHLIGHT_DURATION: 2000
};

// 视图模式
export const VIEW_MODES = {
    TREE: 'tree',
    TAGS: 'tags'
};

// 消息类型
export const MESSAGE_TYPES = {
    USER: 'user',
    PET: 'pet',
    ME: 'me',
    ASSISTANT: 'assistant',
    BOT: 'bot',
    AI: 'ai'
};

// 文件类型
export const FILE_TYPES = {
    FILE: 'file',
    FOLDER: 'folder'
};

// 集合名称
export const COLLECTIONS = {
    SESSIONS: 'sessions',
    FAQS: 'faqs'
};

// URL 协议
export const URL_PROTOCOLS = {
    AICR_SESSION: 'aicr-session://'
};

// 文件扩展名
export const FILE_EXTENSIONS = {
    JSON: '.json',
    ZIP: '.zip'
};
