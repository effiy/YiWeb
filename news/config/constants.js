// 常量和配置

// API配置
const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getApiUrl = (date) => {
    const dateStr = getDateString(date);
    return `https://api.effiy.cn/mongodb/?cname=rss&isoDate=${dateStr},${dateStr}`;
};

export const API_CONFIG = {
    getUrl: getApiUrl,
    timeout: 10000
};

// 分类配置
export const CATEGORIES = [
    { key: 'ai', icon: 'fas fa-robot', title: 'AI技术', keywords: ['ai', '人工智能', 'gpt', '机器学习', '深度学习'] },
    { key: 'data', icon: 'fas fa-chart-line', title: '数据分析', keywords: ['数据', '分析', '统计', '可视化', '报表'] },
    { key: 'code', icon: 'fas fa-code', title: '代码开发', keywords: ['代码', '开发', '编程', '软件', '框架'] },
    { key: 'tech', icon: 'fas fa-microchip', title: '科技产品', keywords: ['产品', '手机', '芯片', '硬件', '设备'] },
    { key: 'business', icon: 'fas fa-briefcase', title: '商业资讯', keywords: ['商业', '投资', '市场', '融资', '创业'] },
    { key: 'other', icon: 'fas fa-ellipsis-h', title: '其他', keywords: [] }
];

// 工具函数
export { getDateString, getApiUrl }; 